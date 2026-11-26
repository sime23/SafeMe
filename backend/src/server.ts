import 'dotenv/config';
import http from 'http';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import trackingRoutes from './routes/trackingRoutes';
import { errorHandler } from './middleware/errorHandler';
import { initSocketServer } from './lib/socket';
import prisma from './lib/prisma';

async function ensureDefaultDevice() {
  try {
    const deviceId = process.env.DEFAULT_DEVICE_ID || 'ESP-32_Tracker';
    const apiToken = process.env.DEFAULT_DEVICE_TOKEN || 'cd_sim_181126_WSOLo6';
    await prisma.device.upsert({
      where: { deviceId },
      update: { isActive: true },
      create: {
        deviceId,
        name: 'ESP32 DevKit - NEO-7M Tracker',
        apiToken,
        isActive: true,
      },
    });
    console.log(`✅ Default tracking device '${deviceId}' ready in database.`);
  } catch (err) {
    console.warn(`[Device Init Notice]:`, err instanceof Error ? err.message : err);
  }
}

const app: Application = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

// Security and utility middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logger for visibility in terminal
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// Service health check
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: 'GPS Tracking Telemetry API',
    status: 'online',
    realtime: 'WebSocket (Socket.IO) active',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Primary Tracking API Routes
app.use('/api/v1/tracking', trackingRoutes);

// Global Error Handler
app.use(errorHandler);

// Create HTTP server and attach Socket.IO for real-time tracking
const httpServer = http.createServer(app);
initSocketServer(httpServer);

// Start server on 0.0.0.0 for LAN & Cloud access
httpServer.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`  GPS Tracking Server listening on http://${HOST}:${PORT}`);
  console.log(`  Local loopback: http://localhost:${PORT}`);
  console.log(`  Real-time WebSockets: ENABLED (Socket.IO)`);
  console.log(`  Ready to receive ESP32 telemetry packets!`);
  console.log(`====================================================`);
  ensureDefaultDevice();
});

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  console.error(`Failed to start server on port ${PORT}:`, err.message);
  process.exit(1);
});

export { app, httpServer };
export default app;
