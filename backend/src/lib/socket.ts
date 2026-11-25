import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { Telemetry } from '@prisma/client';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [WebSocket] Client connected: ${socket.id}`);

    socket.on('subscribe:device', (deviceId: string) => {
      socket.join(`device:${deviceId}`);
      console.log(`📡 [WebSocket] Socket ${socket.id} joined room device:${deviceId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function broadcastTelemetry(telemetry: Telemetry): void {
  if (!io) return;

  // Broadcast globally to all monitoring dashboards
  io.emit('telemetry:new', telemetry);

  // Broadcast to specific device room
  io.to(`device:${telemetry.deviceId}`).emit('telemetry:update', telemetry);
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}
