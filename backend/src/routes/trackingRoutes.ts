import { Router } from 'express';
import {
  recordTelemetry,
  getLatestTelemetry,
  getTelemetryHistory,
  getDeviceStatus,
} from '../controllers/trackingController';
import { authenticateDevice } from '../middleware/auth';
import {
  telemetryRateLimiter,
  generalRateLimiter,
} from '../middleware/rateLimiter';

const router = Router();

// Ingest GPS telemetry from IoT device (ESP32)
router.post(
  '/telemetry',
  telemetryRateLimiter,
  authenticateDevice,
  recordTelemetry
);

// Query latest coordinate for real-time map pin
router.get(
  '/devices/:deviceId/latest',
  generalRateLimiter,
  getLatestTelemetry
);

// Query historical path coordinates for breadcrumb polyline
router.get(
  '/devices/:deviceId/history',
  generalRateLimiter,
  getTelemetryHistory
);

// Query device connectivity and sensor status
router.get(
  '/devices/:deviceId/status',
  generalRateLimiter,
  getDeviceStatus
);

export default router;
