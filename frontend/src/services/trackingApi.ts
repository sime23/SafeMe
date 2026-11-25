import axios, { AxiosError } from 'axios';
import { io, Socket } from 'socket.io-client';
import type {
  LatestTelemetryResponse,
  HistoryResponse,
  DeviceStatusData,
  DeviceStatusResponse,
  TelemetryRecord,
} from '../types/tracking';

// Base URL loaded from Vite environment variables (fallback to localhost:5000)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1/tracking';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class ApiError extends Error {
  statusCode?: number;
  details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{
      success?: boolean;
      error?: string;
      message?: string;
    }>;

    if (axiosErr.response) {
      const serverMessage =
        axiosErr.response.data?.error ||
        axiosErr.response.data?.message ||
        `Server responded with error status ${axiosErr.response.status}`;
      throw new ApiError(serverMessage, axiosErr.response.status, axiosErr.response.data);
    } else if (axiosErr.request) {
      throw new ApiError(
        'Unable to connect to the backend server. Please verify the Express backend is running.',
        0
      );
    }
  }
  throw new ApiError(error instanceof Error ? error.message : 'Unknown communication error');
}

/**
 * Validates that latitude and longitude are valid numeric geographic coordinates
 * and not uncalibrated (0,0) readings.
 */
export function isValidCoordinates(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return false;
  return true;
}

// ============================================================================
//               REAL-TIME WEBSOCKET (SOCKET.IO) CLIENT
// ============================================================================
let socketInstance: Socket | null = null;

export function getSocketConnection(): Socket {
  if (!socketInstance) {
    const wsUrl =
      import.meta.env.VITE_WS_URL ||
      API_BASE_URL.replace(/\/api\/v1\/tracking\/?$/, '') ||
      'http://localhost:5000';

    socketInstance = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ [Real-Time WebSocket] Connected to tracking server');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('⚡ [Real-Time WebSocket] Disconnected:', reason);
    });
  }
  return socketInstance;
}

/**
 * Subscribes to real-time telemetry events pushed directly from the backend.
 * Provides instant zero-latency tracking when the IoT device transmits.
 */
export function subscribeToTelemetry(
  deviceId: string,
  onTelemetry: (record: TelemetryRecord) => void
): () => void {
  const socket = getSocketConnection();

  socket.emit('subscribe:device', deviceId);

  const handleUpdate = (record: TelemetryRecord) => {
    if (record && record.deviceId === deviceId) {
      onTelemetry(record);
    }
  };

  socket.on('telemetry:new', handleUpdate);
  socket.on('telemetry:update', handleUpdate);

  return () => {
    socket.off('telemetry:new', handleUpdate);
    socket.off('telemetry:update', handleUpdate);
  };
}

export const trackingApi = {
  /**
   * Retrieves the most recent telemetry point for a device
   */
  async getLatest(deviceId: string): Promise<LatestTelemetryResponse['data']> {
    try {
      const response = await apiClient.get<LatestTelemetryResponse>(
        `/devices/${encodeURIComponent(deviceId)}/latest`
      );
      if (!response.data.success || !response.data.data) {
        throw new ApiError('Invalid response received from latest telemetry endpoint');
      }
      return response.data.data;
    } catch (error) {
      return handleAxiosError(error);
    }
  },

  /**
   * Retrieves historical GPS positions for trail polyline rendering
   */
  async getHistory(
    deviceId: string,
    limit: number = 100,
    order: 'asc' | 'desc' = 'asc'
  ): Promise<HistoryResponse> {
    try {
      const response = await apiClient.get<HistoryResponse>(
        `/devices/${encodeURIComponent(deviceId)}/history`,
        {
          params: { limit, order },
        }
      );
      if (!response.data.success) {
        throw new ApiError('Failed to retrieve telemetry history');
      }
      return response.data;
    } catch (error) {
      return handleAxiosError(error);
    }
  },

  /**
   * Retrieves device connection health, record count, and GNSS fix quality
   */
  async getStatus(deviceId: string): Promise<DeviceStatusData> {
    try {
      const response = await apiClient.get<DeviceStatusResponse>(
        `/devices/${encodeURIComponent(deviceId)}/status`
      );
      if (!response.data.success || !response.data.data) {
        throw new ApiError('Failed to retrieve device status');
      }
      return response.data.data;
    } catch (error) {
      return handleAxiosError(error);
    }
  },
};

export default trackingApi;
