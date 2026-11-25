import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export interface AuthenticatedDeviceRequest extends Request {
  device?: {
    id: number;
    deviceId: string;
    name: string | null;
    apiToken: string;
    isActive: boolean;
  };
}

export const authenticateDevice = async (
  req: AuthenticatedDeviceRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];

    let token: string | undefined;

    if (apiKeyHeader && typeof apiKeyHeader === 'string') {
      token = apiKeyHeader.trim();
    } else if (authHeader && typeof authHeader === 'string') {
      token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed: Missing API token in x-api-key or Authorization header',
      });
    }

    // 1. Check in database for matching active device
    let device = await prisma.device.findFirst({
      where: {
        apiToken: token,
        isActive: true,
      },
    });

    // 2. Fallback to DEFAULT_DEVICE_TOKEN from environment if not yet registered in DB
    const defaultToken = process.env.DEFAULT_DEVICE_TOKEN;
    if (!device && defaultToken && token === defaultToken) {
      const targetDeviceId = req.body?.deviceId || 'ESP-32_Tracker';
      // Auto-provision or link default device
      device = await prisma.device.upsert({
        where: { deviceId: targetDeviceId },
        update: { apiToken: defaultToken, isActive: true },
        create: {
          deviceId: targetDeviceId,
          name: 'Primary ESP32 DevKit',
          apiToken: defaultToken,
          isActive: true,
        },
      });
    }

    if (!device) {
      return res.status(403).json({
        success: false,
        error: 'Authentication failed: Invalid or inactive device token',
      });
    }

    // If body specifies a deviceId, ensure it matches the authenticated device's token
    if (req.body?.deviceId && req.body.deviceId !== device.deviceId) {
      return res.status(403).json({
        success: false,
        error: `Device ID mismatch: token belongs to '${device.deviceId}', not '${req.body.deviceId}'`,
      });
    }

    req.device = device;
    return next();
  } catch (error) {
    return next(error);
  }
};
