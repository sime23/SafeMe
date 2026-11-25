import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  MapPin,
  Gauge,
  Mountain,
  Satellite,
  Compass,
  Copy,
  Check,
} from 'lucide-react';
import GpsMap from './components/GpsMap';
import DeviceStatusCard from './components/DeviceStatusCard';
import TrackingHistoryTable from './components/TrackingHistoryTable';
import Sidebar from './components/ui/Sidebar';
import Header from './components/ui/Header';
import Alert from './components/ui/Alert';
import Button from './components/ui/Button';
import LoadingState from './components/ui/LoadingState';
import {
  trackingApi,
  isValidCoordinates,
  subscribeToTelemetry,
} from './services/trackingApi';
import type {
  TelemetryRecord,
  DeviceStatusData,
  FocusedWaypoint,
} from './types/tracking';
import './App.css';

const DEFAULT_DEVICE_ID =
  import.meta.env.VITE_DEFAULT_DEVICE_ID || 'ESP-32_Tracker';
const POLL_INTERVAL_MS = Number(
  import.meta.env.VITE_POLL_INTERVAL_MS || 10000
);

/**
 * Isolated live relative time component.
 * Ticks every 1s internally so parent dashboard and map do NOT re-render every second.
 */
interface LiveTimeAgoProps {
  timestamp: string | null;
  emptyText?: string;
}

const LiveTimeAgo: React.FC<LiveTimeAgoProps> = memo(
  ({ timestamp, emptyText = 'No record' }) => {
    const [secondsAgo, setSecondsAgo] = useState<number | null>(() => {
      if (!timestamp) return null;
      return Math.max(
        0,
        Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
      );
    });

    useEffect(() => {
      if (!timestamp) {
        setSecondsAgo(null);
        return;
      }

      const update = () => {
        const diff = Math.max(
          0,
          Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
        );
        setSecondsAgo(diff);
      };

      update();
      const timer = setInterval(update, 1000);
      return () => clearInterval(timer);
    }, [timestamp]);

    if (!timestamp || secondsAgo === null) {
      return <span>{emptyText}</span>;
    }

    if (secondsAgo < 5) {
      return <span>Just now</span>;
    }
    if (secondsAgo < 60) {
      return <span>{secondsAgo}s ago</span>;
    }
    const mins = Math.floor(secondsAgo / 60);
    const remainingSecs = secondsAgo % 60;
    if (mins < 60) {
      return (
        <span>
          {mins}m {remainingSecs}s ago
        </span>
      );
    }
    const hours = Math.floor(mins / 60);
    return <span>{hours}h ago</span>;
  }
);
LiveTimeAgo.displayName = 'LiveTimeAgo';

function getHeadingCardinal(degrees: number | null): string {
  if (degrees === null || degrees === undefined || isNaN(degrees)) return '';
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WSW', 'WNW', 'NW', 'NNW',
  ];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

export function App() {
  const [deviceId] = useState<string>(DEFAULT_DEVICE_ID);
  const [latestPosition, setLatestPosition] = useState<TelemetryRecord | null>(
    null
  );
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusData | null>(
    null
  );
  const [historyTrail, setHistoryTrail] = useState<TelemetryRecord[]>([]);
  const [showTrail, setShowTrail] = useState<boolean>(true);
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [focusedWaypoint, setFocusedWaypoint] = useState<FocusedWaypoint | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isReloadingHistory, setIsReloadingHistory] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  // Ingested record ID tracker to prevent duplicate records
  const seenRecordIdsRef = useRef<Set<number>>(new Set());
  // Last processed GPS record ID to detect genuinely new arrivals
  const lastRecordIdRef = useRef<number | null>(null);

  /**
   * Initial data load:
   * Downloads initial tracking history and device status.
   */
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      setErrorMessage(null);

      const [historyData, latestData, statusData] = await Promise.all([
        trackingApi.getHistory(deviceId, 200, 'asc').catch((err) => {
          console.warn('[Initial History Warning]:', err.message);
          return {
            data: [],
            pagination: { total: 0, page: 1, limit: 200, totalPages: 1 },
            success: true,
          };
        }),
        trackingApi.getLatest(deviceId).catch((err) => {
          console.warn('[Initial Latest Warning]:', err.message);
          return null;
        }),
        trackingApi.getStatus(deviceId).catch((err) => {
          console.warn('[Initial Status Warning]:', err.message);
          return null;
        }),
      ]);

      const initialTrail: TelemetryRecord[] = [];
      if (historyData?.data) {
        for (const rec of historyData.data) {
          if (
            isValidCoordinates(rec.latitude, rec.longitude) &&
            !seenRecordIdsRef.current.has(rec.id)
          ) {
            seenRecordIdsRef.current.add(rec.id);
            initialTrail.push(rec);
          }
        }
      }

      if (statusData) {
        setDeviceStatus(statusData);
      }

      if (
        latestData &&
        isValidCoordinates(latestData.latitude, latestData.longitude)
      ) {
        setLatestPosition(latestData);
        lastRecordIdRef.current = latestData.id;

        if (!seenRecordIdsRef.current.has(latestData.id)) {
          seenRecordIdsRef.current.add(latestData.id);
          initialTrail.push(latestData);
        }
      }

      setHistoryTrail(initialTrail);
    } catch (err: unknown) {
      console.error('[Dashboard Init Error]:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to connect to GPS tracking backend.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  /**
   * Periodic polling function (runs every 10 seconds):
   * ONLY calls /latest and /status.
   */
  const pollLatestRecord = useCallback(async () => {
    try {
      const [latestData, statusData] = await Promise.all([
        trackingApi.getLatest(deviceId).catch(() => null),
        trackingApi.getStatus(deviceId).catch(() => null),
      ]);

      if (statusData) {
        setDeviceStatus(statusData);
      }

      if (
        latestData &&
        isValidCoordinates(latestData.latitude, latestData.longitude)
      ) {
        setErrorMessage(null);

        if (latestData.id !== lastRecordIdRef.current) {
          lastRecordIdRef.current = latestData.id;
          setLatestPosition(latestData);

          if (!seenRecordIdsRef.current.has(latestData.id)) {
            seenRecordIdsRef.current.add(latestData.id);
            setHistoryTrail((prev) => [...prev, latestData]);
          }
        }
      }
    } catch (err: unknown) {
      console.warn(
        '[Polling Warning]:',
        err instanceof Error ? err.message : err
      );
    }
  }, [deviceId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Real-time zero-latency WebSocket stream subscription
  useEffect(() => {
    const unsubscribe = subscribeToTelemetry(deviceId, (incomingRecord) => {
      if (
        isValidCoordinates(incomingRecord.latitude, incomingRecord.longitude)
      ) {
        setErrorMessage(null);

        if (incomingRecord.id !== lastRecordIdRef.current) {
          lastRecordIdRef.current = incomingRecord.id;
          setLatestPosition(incomingRecord);

          if (!seenRecordIdsRef.current.has(incomingRecord.id)) {
            seenRecordIdsRef.current.add(incomingRecord.id);
            setHistoryTrail((prev) => [...prev, incomingRecord]);
          }

          setDeviceStatus((prev) =>
            prev
              ? {
                  ...prev,
                  isOnline: true,
                  lastSeen:
                    incomingRecord.receivedAt || new Date().toISOString(),
                  totalRecords: (prev.totalRecords || 0) + 1,
                }
              : null
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [deviceId]);

  useEffect(() => {
    const timer = setInterval(() => {
      pollLatestRecord();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [pollLatestRecord]);

  const handleClearRoute = useCallback(() => {
    seenRecordIdsRef.current.clear();
    if (latestPosition) {
      seenRecordIdsRef.current.add(latestPosition.id);
      setHistoryTrail([latestPosition]);
    } else {
      setHistoryTrail([]);
    }
    setFocusedWaypoint(null);
  }, [latestPosition]);

  const handleReloadHistory = useCallback(async () => {
    setIsReloadingHistory(true);
    try {
      const res = await trackingApi.getHistory(deviceId, 200, 'asc');
      seenRecordIdsRef.current.clear();
      const freshTrail: TelemetryRecord[] = [];
      if (res?.data) {
        for (const rec of res.data) {
          if (
            isValidCoordinates(rec.latitude, rec.longitude) &&
            !seenRecordIdsRef.current.has(rec.id)
          ) {
            seenRecordIdsRef.current.add(rec.id);
            freshTrail.push(rec);
          }
        }
      }
      setHistoryTrail(freshTrail);
      setFocusedWaypoint(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to reload trail';
      setErrorMessage(msg);
    } finally {
      setIsReloadingHistory(false);
    }
  }, [deviceId]);

  const handleSelectWaypoint = useCallback((record: TelemetryRecord) => {
    setFocusedWaypoint({
      latitude: record.latitude,
      longitude: record.longitude,
      id: record.id,
      timestamp: record.gpsTimestamp,
    });
    setAutoFollow(false);
  }, []);

  const handleUserExplore = useCallback(() => {
    setAutoFollow(false);
  }, []);

  const handleRecenter = useCallback(() => {
    setFocusedWaypoint(null);
    setAutoFollow(true);
  }, []);

  const handleCopyCoords = useCallback(() => {
    if (!latestPosition) return;
    const text = `${latestPosition.latitude.toFixed(6)}, ${latestPosition.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 1600);
  }, [latestPosition]);

  const isOnline =
    Boolean(deviceStatus?.isOnline) &&
    Boolean(latestPosition) &&
    !Boolean(errorMessage);

  return (
    <div className="app-shell">
      {/* 1. Persistent Left Navigation Sidebar */}
      <Sidebar
        deviceId={deviceId}
        isOnline={isOnline}
        totalRecords={deviceStatus?.totalRecords ?? historyTrail.length}
      />

      {/* Main Workspace Area */}
      <div className="app-workspace">
        {/* Section A: Compact Horizontal Application Header */}
        <Header
          deviceId={deviceId}
          isOnline={isOnline}
          autoFollow={autoFollow}
          isRefreshing={isRefreshing}
          pageTitle="Asset Live Monitor"
          lastSyncNode={
            <LiveTimeAgo
              timestamp={
                latestPosition?.receivedAt || deviceStatus?.lastSeen || null
              }
              emptyText="Never"
            />
          }
          onToggleAutoFollow={(val) => {
            if (val) setFocusedWaypoint(null);
            setAutoFollow(val);
          }}
          onRefresh={() => {
            setIsRefreshing(true);
            pollLatestRecord().finally(() => setIsRefreshing(false));
          }}
        />

        {/* Workspace Body */}
        <main className="workspace-container">
          {/* Connection Error Banner */}
          {errorMessage && (
            <Alert
              variant="error"
              title="Backend Connection Notice"
              action={
                <Button variant="danger" size="sm" onClick={() => loadInitialData()}>
                  Retry Connection
                </Button>
              }
            >
              {errorMessage}
            </Alert>
          )}

          {/* Section B: Main Tracking Workspace (CSS Grid: minmax(0, 2fr) minmax(300px, 1fr)) */}
          <section className="tracking-workspace-grid">
            {/* Left Column: Main OpenStreetMap View + Integrated Current Position Bar */}
            <div className="workspace-map-card">
              <div className="workspace-map-body">
                {isLoading ? (
                  <LoadingState
                    message="Connecting to backend and acquiring GPS constellation..."
                    minHeight="100%"
                  />
                ) : (
                  <GpsMap
                    latestPosition={latestPosition}
                    historyPositions={historyTrail}
                    autoFollow={autoFollow}
                    showTrail={showTrail}
                    focusedWaypoint={focusedWaypoint}
                    height="100%"
                    onUserExplore={handleUserExplore}
                    onRecenter={handleRecenter}
                    onClearFocus={() => setFocusedWaypoint(null)}
                  />
                )}
              </div>

              {/* Current Position Information Bar */}
              <div className="map-position-bar">
                <div className="pos-item pos-coords">
                  <span className="pos-label">
                    <MapPin size={11} className="pos-icon" />
                    COORDINATES
                  </span>
                  <span className="pos-val tabular-nums">
                    {latestPosition
                      ? `${latestPosition.latitude.toFixed(6)}°, ${latestPosition.longitude.toFixed(6)}°`
                      : 'Searching...'}
                  </span>
                  {latestPosition && (
                    <button
                      type="button"
                      className="pos-copy-btn"
                      onClick={handleCopyCoords}
                      title="Copy coordinates to clipboard"
                    >
                      {copiedCoords ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedCoords ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div className="pos-item">
                  <span className="pos-label">
                    <Gauge size={11} className="pos-icon" />
                    SPEED
                  </span>
                  <span className="pos-val tabular-nums">
                    {latestPosition?.speed !== null && latestPosition?.speed !== undefined
                      ? `${latestPosition.speed.toFixed(1)} km/h`
                      : '0.0 km/h'}
                  </span>
                </div>

                <div className="pos-item">
                  <span className="pos-label">
                    <Compass size={11} className="pos-icon" />
                    HEADING
                  </span>
                  <span className="pos-val tabular-nums">
                    {latestPosition?.heading !== null && latestPosition?.heading !== undefined
                      ? `${Math.round(latestPosition.heading)}° ${getHeadingCardinal(latestPosition.heading)}`
                      : 'N/A'}
                  </span>
                </div>

                <div className="pos-item">
                  <span className="pos-label">
                    <Mountain size={11} className="pos-icon" />
                    ALTITUDE
                  </span>
                  <span className="pos-val tabular-nums">
                    {latestPosition?.altitude !== null && latestPosition?.altitude !== undefined
                      ? `${latestPosition.altitude.toFixed(0)} m MSL`
                      : 'N/A'}
                  </span>
                </div>

                <div className="pos-item">
                  <span className="pos-label">
                    <Satellite size={11} className="pos-icon" />
                    GNSS FIX
                  </span>
                  <span className="pos-val tabular-nums">
                    {latestPosition?.satellites !== null && latestPosition?.satellites !== undefined
                      ? `${latestPosition.satellites} Sats (${latestPosition.satellites >= 4 ? '3D' : '2D'})`
                      : 'No Fix'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Device Health & Telemetry Panel */}
            <div className="workspace-health-card">
              <DeviceStatusCard
                statusData={deviceStatus}
                latestRecord={latestPosition}
                hasApiError={Boolean(errorMessage)}
                lastCommTimeNode={
                  <LiveTimeAgo
                    timestamp={
                      latestPosition?.receivedAt || deviceStatus?.lastSeen || null
                    }
                    emptyText="N/A"
                  />
                }
              />
            </div>
          </section>

          {/* Section C: Tracking Route Ledger (Beneath main workspace with 20-24px spacing) */}
          <section className="tracking-ledger-section">
            <TrackingHistoryTable
              records={historyTrail}
              isLoading={isLoading}
              isReloading={isReloadingHistory}
              showTrail={showTrail}
              selectedRecordId={focusedWaypoint?.id ?? null}
              onReloadHistory={handleReloadHistory}
              onClearRoute={handleClearRoute}
              onToggleTrail={(show) => setShowTrail(show)}
              onSelectWaypoint={handleSelectWaypoint}
            />
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
