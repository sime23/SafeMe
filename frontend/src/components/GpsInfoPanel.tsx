import React, { memo } from 'react';
import {
  Compass,
  Gauge,
  Mountain,
  Satellite,
  MapPin,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import type { TelemetryRecord } from '../types/tracking';
import './GpsInfoPanel.css';

interface GpsInfoPanelProps {
  record: TelemetryRecord | null;
  lastUpdateTimeNode?: React.ReactNode;
}

function getCompassHeading(degrees: number | null): { cardinal: string; deg: number } {
  if (degrees === null || degrees === undefined || isNaN(degrees)) {
    return { cardinal: 'N/A', deg: 0 };
  }
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return { cardinal: directions[index], deg: normalized };
}

function getHdopRating(hdop: number | null): { rating: string; statusClass: string } {
  if (hdop === null || hdop === undefined) {
    return { rating: 'N/A', statusClass: 'status-neutral' };
  }
  if (hdop <= 1.0) return { rating: 'Ideal', statusClass: 'status-success' };
  if (hdop <= 2.0) return { rating: 'Excellent', statusClass: 'status-success' };
  if (hdop <= 5.0) return { rating: 'Good', statusClass: 'status-info' };
  if (hdop <= 10.0) return { rating: 'Moderate', statusClass: 'status-warning' };
  return { rating: 'Poor', statusClass: 'status-danger' };
}

export const GpsInfoPanel: React.FC<GpsInfoPanelProps> = memo(
  ({ record, lastUpdateTimeNode }) => {
    const [copied, setCopied] = React.useState(false);

    if (!record) {
      return (
        <div className="telemetry-panel">
          <div className="panel-title-bar">
            <span className="panel-heading">TELEMETRY SUMMARY</span>
          </div>
          <div className="panel-empty-state">
            <Satellite size={22} className="empty-icon" />
            <span>Awaiting satellite fix from device...</span>
          </div>
        </div>
      );
    }

    const headingInfo = getCompassHeading(record.heading);
    const hdopInfo = getHdopRating(record.hdop);
    const formattedGpsTime = record.gpsTimestamp
      ? new Date(record.gpsTimestamp).toLocaleTimeString()
      : 'N/A';
    const formattedGpsDate = record.gpsTimestamp
      ? new Date(record.gpsTimestamp).toLocaleDateString()
      : 'N/A';

    const handleCopyCoords = () => {
      const text = `${record.latitude.toFixed(6)}, ${record.longitude.toFixed(6)}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    };

    return (
      <div className="telemetry-panel">
        <div className="panel-title-bar">
          <span className="panel-heading">TELEMETRY SUMMARY</span>
          <span className="telemetry-fix-state">
            <span className="state-dot live" />
            <span className="state-text">Live 3D Fix</span>
          </span>
        </div>

        <div className="telemetry-groups">
          {/* Group 1: Position */}
          <div className="telemetry-group">
            <div className="group-label-row">
              <span className="group-label">
                <MapPin size={12} className="group-icon" />
                POSITION
              </span>
              <button
                type="button"
                className="copy-coord-btn"
                onClick={handleCopyCoords}
                title="Copy coordinates to clipboard"
                aria-label="Copy coordinates to clipboard"
              >
                {copied ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="position-readout">
              <div className="coord-pair">
                <span className="coord-sub">LAT</span>
                <span className="coord-num tabular-nums">
                  {record.latitude.toFixed(6)}&deg; N
                </span>
              </div>
              <div className="coord-pair">
                <span className="coord-sub">LON</span>
                <span className="coord-num tabular-nums">
                  {record.longitude.toFixed(6)}&deg; E
                </span>
              </div>
            </div>
          </div>

          {/* Group 2: Movement */}
          <div className="telemetry-group">
            <span className="group-label">
              <Gauge size={12} className="group-icon" />
              MOVEMENT
            </span>
            <div className="metric-row">
              <div className="metric-block">
                <span className="metric-sublabel">GROUND SPEED</span>
                <div className="metric-val-wrap">
                  <span className="metric-val tabular-nums">
                    {record.speed !== null ? record.speed.toFixed(1) : '0.0'}
                  </span>
                  <span className="metric-unit">km/h</span>
                </div>
                <span className="metric-state-text">
                  {record.speed !== null && record.speed > 0.5 ? 'In Motion' : 'Stationary'}
                </span>
              </div>

              <div className="metric-block">
                <span className="metric-sublabel">HEADING / COURSE</span>
                <div className="metric-val-wrap">
                  <span className="metric-val tabular-nums">
                    {record.heading !== null ? `${record.heading.toFixed(0)}°` : '0°'}
                  </span>
                  <span className="metric-unit">{headingInfo.cardinal}</span>
                  <div
                    className="compass-indicator"
                    style={{ transform: `rotate(${headingInfo.deg}deg)` }}
                    title={`Bearing: ${headingInfo.deg.toFixed(1)}°`}
                  >
                    <Compass size={13} />
                  </div>
                </div>
                <span className="metric-state-text">Bearing from True North</span>
              </div>
            </div>
          </div>

          {/* Group 3: Elevation */}
          <div className="telemetry-group">
            <span className="group-label">
              <Mountain size={12} className="group-icon" />
              ELEVATION
            </span>
            <div className="metric-row single">
              <div className="metric-block">
                <span className="metric-sublabel">ALTITUDE (MSL)</span>
                <div className="metric-val-wrap">
                  <span className="metric-val tabular-nums">
                    {record.altitude !== null ? record.altitude.toFixed(1) : 'N/A'}
                  </span>
                  <span className="metric-unit">meters</span>
                </div>
                <span className="metric-state-text">Mean Sea Level Elevation</span>
              </div>
            </div>
          </div>

          {/* Group 4: GPS Quality */}
          <div className="telemetry-group">
            <span className="group-label">
              <Satellite size={12} className="group-icon" />
              GPS QUALITY
            </span>
            <div className="metric-row">
              <div className="metric-block">
                <span className="metric-sublabel">SATELLITES IN FIX</span>
                <div className="metric-val-wrap">
                  <span className="metric-val tabular-nums">
                    {record.satellites ?? '0'}
                  </span>
                  <span className="metric-unit">locked</span>
                </div>
                <span className="metric-state-text">
                  {record.satellites !== null && record.satellites >= 4
                    ? '3D Triangulation'
                    : '2D Marginal Fix'}
                </span>
              </div>

              <div className="metric-block">
                <span className="metric-sublabel">HDOP PRECISION</span>
                <div className="metric-val-wrap">
                  <span className="metric-val tabular-nums">
                    {record.hdop !== null ? record.hdop.toFixed(2) : 'N/A'}
                  </span>
                  <span className={`hdop-indicator ${hdopInfo.statusClass}`}>
                    {hdopInfo.rating}
                  </span>
                </div>
                <span className="metric-state-text">Dilution of Precision</span>
              </div>
            </div>
          </div>

          {/* Group 5: Freshness */}
          <div className="telemetry-group last">
            <span className="group-label">
              <Clock size={12} className="group-icon" />
              FRESHNESS
            </span>
            <div className="freshness-readout">
              <div className="freshness-item">
                <span className="freshness-label">LAST GPS FIX</span>
                <span className="freshness-val tabular-nums">
                  {formattedGpsDate} {formattedGpsTime}
                </span>
              </div>
              {lastUpdateTimeNode && (
                <div className="freshness-item">
                  <span className="freshness-label">LATENCY / AGE</span>
                  <span className="freshness-age tabular-nums">
                    {lastUpdateTimeNode}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

GpsInfoPanel.displayName = 'GpsInfoPanel';
export default GpsInfoPanel;
