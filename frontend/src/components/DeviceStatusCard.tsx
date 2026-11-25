import React, { memo } from 'react';
import {
  Wifi,
  Crosshair,
  Satellite,
  Database,
  Clock,
  Radio,
  Activity,
} from 'lucide-react';
import type { DeviceStatusData, TelemetryRecord } from '../types/tracking';
import './DeviceStatusCard.css';

interface DeviceStatusCardProps {
  statusData: DeviceStatusData | null;
  latestRecord: TelemetryRecord | null;
  hasApiError: boolean;
  lastCommTimeNode?: React.ReactNode;
  className?: string;
}

function getHdopRating(hdop: number | null): {
  label: string;
  variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
} {
  if (hdop === null || hdop === undefined || isNaN(hdop)) {
    return { label: 'N/A', variant: 'neutral' };
  }
  if (hdop <= 1.0) return { label: 'Ideal', variant: 'success' };
  if (hdop <= 2.0) return { label: 'Excellent', variant: 'success' };
  if (hdop <= 5.0) return { label: 'Good', variant: 'info' };
  if (hdop <= 10.0) return { label: 'Moderate', variant: 'warning' };
  return { label: 'Poor', variant: 'danger' };
}

export const DeviceStatusCard: React.FC<DeviceStatusCardProps> = memo(
  ({ statusData, latestRecord, hasApiError, lastCommTimeNode, className = '' }) => {
    // 1. Device Connectivity State
    let statusLabel = 'Offline / Unreachable';
    let statusClass = 'state-offline';
    let statusDesc = 'Backend server unreachable or device inactive';

    const lastTimestamp = latestRecord?.receivedAt || statusData?.lastSeen;
    let ageSeconds: number | null = null;

    if (!hasApiError && statusData && lastTimestamp) {
      ageSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(lastTimestamp).getTime()) / 1000)
      );

      if (ageSeconds <= 75) {
        statusLabel = 'Online (Live Cadence)';
        statusClass = 'state-online';
        statusDesc = `Active transmission received ${ageSeconds}s ago`;
      } else if (ageSeconds <= 300) {
        statusLabel = 'Stale Fix (Delayed)';
        statusClass = 'state-stale';
        statusDesc = `Last fix ${ageSeconds}s ago (> 75s window)`;
      } else {
        statusLabel = 'Offline';
        statusClass = 'state-offline';
        const mins = Math.floor(ageSeconds / 60);
        statusDesc = `No packet received for ${mins} minutes`;
      }
    }

    // 2. GPS Fix Validity
    const sats =
      latestRecord?.satellites ?? statusData?.fixQuality?.satellites ?? null;
    const hdop = latestRecord?.hdop ?? statusData?.fixQuality?.hdop ?? null;

    let fixLabel = 'No GPS Fix';
    let fixClass = 'state-offline';
    let fixDesc = '0 satellites locked • Antenna searching constellation';

    if (sats !== null && sats >= 4) {
      fixLabel = `3D Fix Valid (${sats} Sats)`;
      fixClass = 'state-online';
      fixDesc = 'Optimal 3D triangulation locked';
    } else if (sats !== null && sats > 0) {
      fixLabel = `2D Fix Marginal (${sats} Sats)`;
      fixClass = 'state-stale';
      fixDesc = 'Insufficient satellite geometry (< 4 satellites)';
    }

    // 3. Satellites & HDOP
    const hdopInfo = getHdopRating(hdop);
    const hdopFormatted = hdop !== null ? hdop.toFixed(2) : 'N/A';

    // 4. Backend Ingestion
    const formattedIngestDate = lastTimestamp
      ? new Date(lastTimestamp).toLocaleDateString()
      : 'N/A';
    const formattedIngestTime = lastTimestamp
      ? new Date(lastTimestamp).toLocaleTimeString()
      : 'N/A';
    const totalPersisted = statusData?.totalRecords ?? latestRecord?.id ?? 0;

    return (
      <div className={`health-panel ${className}`}>
        {/* Panel Title Bar */}
        <div className="health-title-bar">
          <div className="health-title-left">
            <Activity size={13} className="health-title-icon" />
            <span className="health-heading">DEVICE HEALTH &amp; TELEMETRY</span>
          </div>
          <span className="health-device-id tabular-nums">
            {statusData?.deviceId || 'ESP-32_Tracker'}
          </span>
        </div>

        {/* 6 Structured Health & Telemetry Items */}
        <div className="health-items">
          {/* 1. Device Connectivity */}
          <div className="health-item">
            <div className="health-item-head">
              <span className="health-item-label">
                <Wifi size={12} className="health-icon" />
                CONNECTIVITY
              </span>
              <span className={`health-status-indicator ${statusClass}`}>
                <span className="indicator-pip" />
                <span className="indicator-text">{statusLabel}</span>
              </span>
            </div>
            <span className="health-desc">{statusDesc}</span>
          </div>

          {/* 2. GPS Fix Validity */}
          <div className="health-item">
            <div className="health-item-head">
              <span className="health-item-label">
                <Crosshair size={12} className="health-icon" />
                GPS FIX VALIDITY
              </span>
              <span className={`health-status-indicator ${fixClass}`}>
                <span className="indicator-pip" />
                <span className="indicator-text">{fixLabel}</span>
              </span>
            </div>
            <span className="health-desc">{fixDesc}</span>
          </div>

          {/* 3. Satellites & HDOP Precision */}
          <div className="health-item">
            <div className="health-item-head">
              <span className="health-item-label">
                <Satellite size={12} className="health-icon" />
                SATELLITES &amp; HDOP
              </span>
              <div className="health-hdop-badge-wrap">
                <span className="health-stat-val tabular-nums">
                  HDOP {hdopFormatted}
                </span>
                <span className={`health-hdop-pill ${hdopInfo.variant}`}>
                  {hdopInfo.label}
                </span>
              </div>
            </div>
            <span className="health-desc">
              <strong className="tabular-nums">{sats ?? 0}</strong> satellites locked &bull; Dilution of Precision
            </span>
          </div>

          {/* 4. Backend Ingestion & SQLite Storage */}
          <div className="health-item">
            <div className="health-item-head">
              <span className="health-item-label">
                <Database size={12} className="health-icon" />
                BACKEND INGESTION
              </span>
              <span className="health-stat-val tabular-nums">
                {formattedIngestDate} {formattedIngestTime}
              </span>
            </div>
            <span className="health-desc">
              <strong className="tabular-nums">{totalPersisted}</strong> records persisted in SQLite (dev.db)
            </span>
          </div>

          {/* 5. Communication Freshness */}
          <div className="health-item">
            <div className="health-item-head">
              <span className="health-item-label">
                <Clock size={12} className="health-icon" />
                COMMUNICATION FRESHNESS
              </span>
              <span className="health-stat-freshness tabular-nums">
                {lastCommTimeNode ?? 'Awaiting signal'}
              </span>
            </div>
            <span className="health-desc">
              Latest HTTP packet handshake with Express REST API
            </span>
          </div>

          {/* 6. Transmission Interval */}
          <div className="health-item last">
            <div className="health-item-head">
              <span className="health-item-label">
                <Radio size={12} className="health-icon" />
                TRANSMISSION INTERVAL
              </span>
              <span className="health-stat-cadence tabular-nums">
                ~30s Cadence
              </span>
            </div>
            <span className="health-desc">
              Dual-Core FreeRTOS task &bull; HTTP REST (:5000)
            </span>
          </div>
        </div>
      </div>
    );
  }
);

DeviceStatusCard.displayName = 'DeviceStatusCard';
export default DeviceStatusCard;
