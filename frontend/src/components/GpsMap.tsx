import React, { useEffect, useRef, memo, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Layers } from 'lucide-react';
import type { TelemetryRecord, FocusedWaypoint } from '../types/tracking';
import './GpsMap.css';

/**
 * Controller component that smoothly pans the map to the latest position
 * when auto-follow is active, handles focused waypoints, and detects user manual drag.
 */
interface MapControllerProps {
  center: [number, number];
  autoFollow: boolean;
  focusedWaypoint?: FocusedWaypoint | null;
  onUserExplore?: () => void;
}

const MapController: React.FC<MapControllerProps> = memo(
  ({ center, autoFollow, focusedWaypoint, onUserExplore }) => {
    const map = useMap();
    const lastPanCenterRef = useRef<[number, number]>(center);

    useMapEvents({
      dragstart: () => {
        if (onUserExplore) {
          onUserExplore();
        }
      },
    });

    useEffect(() => {
      if (focusedWaypoint) {
        map.panTo([focusedWaypoint.latitude, focusedWaypoint.longitude], {
          animate: true,
          duration: 1.0,
        });
      }
    }, [focusedWaypoint, map]);

    useEffect(() => {
      if (autoFollow && !focusedWaypoint && center[0] && center[1]) {
        const [targetLat, targetLng] = center;
        const [lastLat, lastLng] = lastPanCenterRef.current;
        const dist = Math.hypot(targetLat - lastLat, targetLng - lastLng);

        if (dist > 0.000001) {
          lastPanCenterRef.current = center;
          map.panTo(center, { animate: true, duration: 1.0 });
        }
      }
    }, [center, autoFollow, focusedWaypoint, map]);

    useEffect(() => {
      const container = map.getContainer();
      if (!container || typeof ResizeObserver === 'undefined') return;

      const ro = new ResizeObserver(() => {
        map.invalidateSize();
      });
      ro.observe(container);

      return () => {
        ro.disconnect();
      };
    }, [map]);

    return null;
  }
);
MapController.displayName = 'MapController';

/**
 * Creates an enterprise directional radar puck icon for the moving GPS device
 */
function createPuckIcon(heading: number | null): L.DivIcon {
  const deg = heading !== null && !isNaN(heading) ? heading : 0;
  return L.divIcon({
    className: 'ui-puck-container',
    html: `
      <div class="ui-puck" style="--heading-deg: ${deg}deg;">
        <div class="ui-puck-halo"></div>
        <div class="ui-puck-ring">
          <svg viewBox="0 0 24 24" class="ui-puck-arrow">
            <path d="M12 3L4 20L12 16L20 20L12 3Z" fill="#FFFFFF"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

/**
 * Animated Marker component that smoothly glides between genuine GPS positions
 * using requestAnimationFrame.
 *
 * IMPORTANT:
 * - Interpolated positions are purely visual and transient.
 * - Interpolated positions are NEVER saved into genuine telemetry state or backend DB.
 * - The popup always renders the genuine TelemetryRecord fields.
 */
interface SmoothMarkerProps {
  record: TelemetryRecord;
}

const SmoothMarker: React.FC<SmoothMarkerProps> = memo(({ record }) => {
  const targetPos: [number, number] = [record.latitude, record.longitude];
  const markerRef = useRef<L.Marker | null>(null);
  const currentPosRef = useRef<[number, number]>(targetPos);
  const animFrameRef = useRef<number | null>(null);

  const puckIcon = useMemo(() => createPuckIcon(record.heading), [record.heading]);

  useEffect(() => {
    const [toLat, toLng] = targetPos;
    const [fromLat, fromLng] = currentPosRef.current;

    const distDeg = Math.hypot(toLat - fromLat, toLng - fromLng);
    if (distDeg < 0.000001) {
      return;
    }

    if (distDeg > 0.05) {
      currentPosRef.current = targetPos;
      if (markerRef.current) {
        markerRef.current.setLatLng(targetPos);
      }
      return;
    }

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const startTime = performance.now();
    const duration = 1200;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      const ease =
        progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

      const lat = fromLat + (toLat - fromLat) * ease;
      const lng = fromLng + (toLng - fromLng) * ease;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        currentPosRef.current = targetPos;
        if (markerRef.current) {
          markerRef.current.setLatLng(targetPos);
        }
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [targetPos[0], targetPos[1]]);

  const formattedTime = new Date(record.gpsTimestamp).toLocaleTimeString();
  const formattedDate = new Date(record.gpsTimestamp).toLocaleDateString();

  return (
    <Marker ref={markerRef} position={currentPosRef.current} icon={puckIcon}>
      <Popup minWidth={240}>
        <div className="map-popup-card">
          <div className="popup-masthead">
            <span className="popup-status-pip" />
            <span className="popup-device-tag tabular-nums">{record.deviceId}</span>
          </div>

          <div className="popup-coords-well">
            <span className="tabular-nums">
              {record.latitude.toFixed(6)}&deg; N, {record.longitude.toFixed(6)}&deg; E
            </span>
          </div>

          <div className="popup-data-grid">
            <div className="popup-data-item">
              <span className="data-key">SPEED</span>
              <span className="data-val tabular-nums">
                {record.speed !== null ? `${record.speed.toFixed(1)} km/h` : '0.0'}
              </span>
            </div>

            <div className="popup-data-item">
              <span className="data-key">ALTITUDE</span>
              <span className="data-val tabular-nums">
                {record.altitude !== null ? `${record.altitude.toFixed(0)} m` : 'N/A'}
              </span>
            </div>

            <div className="popup-data-item">
              <span className="data-key">SATELLITES</span>
              <span className="data-val tabular-nums">{record.satellites ?? '0'} sats</span>
            </div>

            <div className="popup-data-item">
              <span className="data-key">HDOP</span>
              <span className="data-val tabular-nums">
                {record.hdop !== null ? record.hdop.toFixed(2) : 'N/A'}
              </span>
            </div>
          </div>

          <div className="popup-bottom-meta">
            <span className="tabular-nums">Fix Time: {formattedDate} {formattedTime}</span>
            <span className="tabular-nums">Ingest #{record.id}</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
});
SmoothMarker.displayName = 'SmoothMarker';

export interface GpsMapProps {
  latestPosition: TelemetryRecord | null;
  historyPositions?: TelemetryRecord[];
  autoFollow?: boolean;
  showTrail?: boolean;
  focusedWaypoint?: FocusedWaypoint | null;
  height?: string;
  className?: string;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  onUserExplore?: () => void;
  onRecenter?: () => void;
  onClearFocus?: () => void;
}

const GpsMapComponent: React.FC<GpsMapProps> = ({
  latestPosition,
  historyPositions = [],
  autoFollow = true,
  showTrail = true,
  focusedWaypoint = null,
  height = '580px',
  className = '',
  defaultCenter = [3.8326, 11.4628],
  defaultZoom = 16,
  onUserExplore,
  onRecenter,
  onClearFocus,
}) => {
  const currentCenter: [number, number] = focusedWaypoint
    ? [focusedWaypoint.latitude, focusedWaypoint.longitude]
    : latestPosition
    ? [latestPosition.latitude, latestPosition.longitude]
    : defaultCenter;

  const polylineCoords: [number, number][] = showTrail
    ? historyPositions
        .filter(
          (p) =>
            typeof p.latitude === 'number' &&
            typeof p.longitude === 'number' &&
            !isNaN(p.latitude) &&
            !isNaN(p.longitude)
        )
        .map((p) => [p.latitude, p.longitude])
    : [];

  return (
    <div className={`ui-map-wrapper ${className}`} style={{ height }}>
      {/* Floating HUD Toolstrip */}
      <div className="map-hud-overlay">
        {(!autoFollow || focusedWaypoint) && latestPosition && onRecenter && (
          <button
            type="button"
            className="hud-action-btn hud-recenter-btn"
            onClick={() => {
              if (onClearFocus) onClearFocus();
              onRecenter();
            }}
            title="Re-center map on live tracker and resume auto-follow"
          >
            <Crosshair size={13} />
            <span>Recenter Tracker</span>
          </button>
        )}

        {showTrail && polylineCoords.length > 0 && (
          <div className="hud-badge tabular-nums">
            <Layers size={12} className="hud-badge-icon" />
            <span>{polylineCoords.length} fixes</span>
          </div>
        )}
      </div>

      <MapContainer
        center={currentCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        zoomControl={false}
        className="ui-map-container"
      >
        <MapController
          center={currentCenter}
          autoFollow={autoFollow}
          focusedWaypoint={focusedWaypoint}
          onUserExplore={onUserExplore}
        />

        {/* Refined Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Bottom-right zoom controls */}
        <ZoomControl position="bottomright" />

        {/* Precision Historical Route Polyline */}
        {polylineCoords.length > 1 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: '#2563eb',
              weight: 3,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Trail Origin Waypoint Marker */}
        {polylineCoords.length > 1 && (
          <CircleMarker
            center={polylineCoords[0]}
            radius={5}
            pathOptions={{
              color: '#475569',
              fillColor: '#94a3b8',
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup minWidth={140}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A' }}>
                Trail Start Origin
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Focused Historical Waypoint Marker */}
        {focusedWaypoint && (
          <CircleMarker
            center={[focusedWaypoint.latitude, focusedWaypoint.longitude]}
            radius={8}
            pathOptions={{
              color: '#f59e0b',
              fillColor: '#fbbf24',
              fillOpacity: 0.95,
              weight: 2.5,
            }}
          >
            <Popup minWidth={180}>
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <strong style={{ color: '#b45309' }}>
                  Historical Fix #{focusedWaypoint.id ?? ''}
                </strong>
                <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>
                  {focusedWaypoint.latitude.toFixed(6)}&deg; N, {focusedWaypoint.longitude.toFixed(6)}&deg; E
                </span>
                {focusedWaypoint.timestamp && (
                  <span style={{ color: '#64748B', fontSize: '10px' }}>
                    {new Date(focusedWaypoint.timestamp).toLocaleString()}
                  </span>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Live Device Directional Puck Marker */}
        {latestPosition && <SmoothMarker record={latestPosition} />}
      </MapContainer>
    </div>
  );
};

export const GpsMap = memo(GpsMapComponent);
export default GpsMap;
