import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { broadcastTelemetry } from '../lib/socket';
import {
  telemetryPayloadSchema,
  historyQuerySchema,
} from '../schemas/trackingSchema';
import { AuthenticatedDeviceRequest } from '../middleware/auth';

/**
 * Assess GPS fix quality based on HDOP and satellite count
 */
function evaluateFixQuality(satellites: number | null, hdop: number | null) {
  if (satellites === null || satellites === 0) return 'No Fix';
  if (hdop === null) return satellites >= 4 ? '3D Fix' : '2D Fix';

  if (hdop < 1.0) return 'Ideal';
  if (hdop <= 2.0) return 'Excellent';
  if (hdop <= 5.0) return 'Good';
  if (hdop <= 10.0) return 'Moderate';
  return 'Poor';
}

/**
 * POST /api/v1/tracking/telemetry
 * Ingests a new GPS telemetry record from an authenticated IoT device
 */
export const recordTelemetry = async (
  req: AuthenticatedDeviceRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = telemetryPayloadSchema.parse(req.body);

    const now = new Date();

    // Store historical telemetry record in PostgreSQL/SQLite
    const [telemetry] = await prisma.$transaction([
      prisma.telemetry.create({
        data: {
          deviceId: validatedData.deviceId,
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
          altitude: validatedData.altitude ?? null,
          speed: validatedData.speed ?? null,
          heading: validatedData.heading ?? null,
          satellites: validatedData.satellites ?? null,
          hdop: validatedData.hdop ?? null,
          gpsTimestamp: validatedData.gpsTimestamp,
          receivedAt: now,
        },
      }),
      // Update device lastSeen timestamp
      prisma.device.update({
        where: { deviceId: validatedData.deviceId },
        data: { lastSeen: now },
      }),
    ]);

    console.log(
      `📍 [GPS INGEST] Device: ${validatedData.deviceId} | Lat: ${validatedData.latitude.toFixed(6)}, Lon: ${validatedData.longitude.toFixed(6)} | Alt: ${validatedData.altitude ?? 0}m | Sats: ${validatedData.satellites ?? 0} | Speed: ${validatedData.speed ?? 0} km/h`
    );

    // Broadcast in real-time over WebSocket (zero-latency push to connected dashboards)
    broadcastTelemetry(telemetry);

    return res.status(201).json({
      success: true,
      message: 'Telemetry recorded successfully',
      data: telemetry,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/tracking/devices/:deviceId/latest
 * Retrieves the most recent telemetry point for a specific device
 */
export const getLatestTelemetry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { deviceId } = req.params;

    const latest = await prisma.telemetry.findFirst({
      where: { deviceId },
      orderBy: { gpsTimestamp: 'desc' },
    });

    if (!latest) {
      return res.status(200).json({
        success: true,
        message: `No telemetry records found for device '${deviceId}' yet`,
        data: null,
      });
    }

    const ageSeconds = Math.round(
      (Date.now() - new Date(latest.gpsTimestamp).getTime()) / 1000
    );

    return res.status(200).json({
      success: true,
      data: {
        ...latest,
        ageSeconds,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/tracking/devices/:deviceId/history
 * Returns paginated historical GPS trail for route playback / Leaflet polylines
 */
export const getTelemetryHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { deviceId } = req.params;
    const query = historyQuerySchema.parse(req.query);

    const whereClause: any = {
      deviceId,
    };

    if (query.from || query.to) {
      whereClause.gpsTimestamp = {};
      if (query.from) {
        whereClause.gpsTimestamp.gte = new Date(query.from);
      }
      if (query.to) {
        whereClause.gpsTimestamp.lte = new Date(query.to);
      }
    }

    const skip = (query.page - 1) * query.limit;

    const [total, records] = await prisma.$transaction([
      prisma.telemetry.count({ where: whereClause }),
      prisma.telemetry.findMany({
        where: whereClause,
        orderBy: { gpsTimestamp: query.order },
        skip,
        take: query.limit,
      }),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
      data: records,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/tracking/devices/:deviceId/status
 * Returns online status, connectivity health, and latest fix diagnostics
 */
export const getDeviceStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { deviceId } = req.params;

    let device = await prisma.device.findUnique({
      where: { deviceId },
      include: {
        telemetries: {
          orderBy: { gpsTimestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!device) {
      // Auto-provision default tracker if requested
      const defaultToken =
        process.env.DEFAULT_DEVICE_TOKEN || 'cd_sim_181126_WSOLo6';
      device = await prisma.device.upsert({
        where: { deviceId },
        update: { isActive: true },
        create: {
          deviceId,
          name: 'ESP32 DevKit - NEO-7M Tracker',
          apiToken: defaultToken,
          isActive: true,
        },
        include: {
          telemetries: {
            orderBy: { gpsTimestamp: 'desc' },
            take: 1,
          },
        },
      });
    }

    const latest = device.telemetries[0] ?? null;

    // Device is considered online if last telemetry was received within the last 5 minutes (300 seconds)
    const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000;
    const lastSeenTime = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;
    const isOnline = Date.now() - lastSeenTime < OFFLINE_THRESHOLD_MS;

    const totalRecords = await prisma.telemetry.count({
      where: { deviceId },
    });

    return res.status(200).json({
      success: true,
      data: {
        deviceId: device.deviceId,
        name: device.name,
        isActive: device.isActive,
        isOnline,
        lastSeen: device.lastSeen,
        totalRecords,
        latestCoordinates: latest
          ? {
              latitude: latest.latitude,
              longitude: latest.longitude,
              altitude: latest.altitude,
              speed: latest.speed,
              heading: latest.heading,
              gpsTimestamp: latest.gpsTimestamp,
              receivedAt: latest.receivedAt,
            }
          : null,
        fixQuality: latest
          ? {
              satellites: latest.satellites,
              hdop: latest.hdop,
              rating: evaluateFixQuality(latest.satellites, latest.hdop),
            }
          : null,
      },
    });
  } catch (error) {
    return next(error);
  }
};
