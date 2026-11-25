import React from 'react';
import { RefreshCw, Radio, Clock } from 'lucide-react';
import { Button } from './Button';
import './Header.css';

export interface HeaderProps {
  deviceId: string;
  isOnline: boolean;
  autoFollow: boolean;
  isRefreshing: boolean;
  pageTitle?: string;
  lastSyncNode?: React.ReactNode;
  onToggleAutoFollow: (enabled: boolean) => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  deviceId,
  isOnline,
  autoFollow,
  isRefreshing,
  pageTitle = 'Asset Live Monitor',
  lastSyncNode,
  onToggleAutoFollow,
  onRefresh,
}) => {
  return (
    <header className="ui-header">
      {/* Left: Application Title, Device Identifier, Connection State */}
      <div className="ui-header-left">
        <div className="ui-header-branding">
          <h1 className="ui-header-title">{pageTitle}</h1>
          <span className="ui-header-device-pill tabular-nums" title={`Device ID: ${deviceId}`}>
            {deviceId}
          </span>
        </div>

        {/* Device Connection Status Indicator */}
        <div className="ui-status-strip" title="Telemetry transmission status">
          <span className={`ui-status-pip ${isOnline ? 'online' : 'offline'}`} />
          <span className="ui-status-text">
            {isOnline ? 'Live Link (30s)' : 'Link Idle'}
          </span>
        </div>
      </div>

      {/* Right: Last Sync Info, Auto-Follow Segment, Sync Action */}
      <div className="ui-header-right">
        {/* Last Synchronization Timestamp */}
        {lastSyncNode && (
          <div className="ui-header-sync-info" title="Last backend data synchronization">
            <Clock size={12} className="ui-sync-icon" />
            <span className="ui-sync-label">Sync:</span>
            <span className="ui-sync-val tabular-nums">{lastSyncNode}</span>
          </div>
        )}

        {/* Auto-Follow Toggle Control */}
        <div className="ui-follow-toggle" role="group" aria-label="Auto-follow mode">
          <button
            type="button"
            className={`ui-toggle-segment ${autoFollow ? 'active' : ''}`}
            onClick={() => onToggleAutoFollow(true)}
            title="Automatically follow device position on map"
            aria-pressed={autoFollow}
          >
            <Radio size={12} />
            <span>Follow</span>
          </button>
          <button
            type="button"
            className={`ui-toggle-segment ${!autoFollow ? 'active' : ''}`}
            onClick={() => onToggleAutoFollow(false)}
            title="Free map exploration without auto-centering"
            aria-pressed={!autoFollow}
          >
            <span>Free</span>
          </button>
        </div>

        {/* Manual Refresh / Ingest Trigger */}
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          loading={isRefreshing}
          onClick={onRefresh}
          title="Query latest telemetry record immediately"
        >
          {isRefreshing ? 'Syncing...' : 'Sync'}
        </Button>
      </div>
    </header>
  );
};

export default Header;
