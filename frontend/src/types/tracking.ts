export interface TelemetryRecord {
  id: number;
  deviceId: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  satellites: number | null;
  hdop: number | null;
  gpsTimestamp: string;
  receivedAt: string;
}

export interface LatestTelemetryResponse {
  success: boolean;
  data: TelemetryRecord & {
    ageSeconds: number;
  };
}

export interface HistoryPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HistoryResponse {
  success: boolean;
  pagination: HistoryPagination;
  data: TelemetryRecord[];
}

export interface DeviceStatusData {
  deviceId: string;
  name: string | null;
  isActive: boolean;
  isOnline: boolean;
  lastSeen: string | null;
  totalRecords: number;
  latestCoordinates: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
    gpsTimestamp: string;
    receivedAt: string;
  } | null;
  fixQuality: {
    satellites: number | null;
    hdop: number | null;
    rating: string;
  } | null;
}

export interface DeviceStatusResponse {
  success: boolean;
  data: DeviceStatusData;
}

export type DeviceConnectivityState = 'ONLINE' | 'STALE' | 'UNAVAILABLE';

export interface DeviceHealthSummary {
  state: DeviceConnectivityState;
  label: string;
  badgeClass: string;
  ageSeconds: number | null;
  explanation: string;
}

export interface GpsValiditySummary {
  isValid: boolean;
  label: string;
  badgeClass: string;
  rating: string;
  satellites: number;
  hdop: number | null;
}

export interface FocusedWaypoint {
  latitude: number;
  longitude: number;
  id?: number;
  label?: string;
  timestamp?: string;
}
