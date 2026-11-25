import React from 'react';
import {
  Navigation,
  Layers,
  MapPin,
  Activity,
  Database,
  SlidersHorizontal,
  Wifi,
  ChevronRight,
} from 'lucide-react';
import './Sidebar.css';

export interface SidebarProps {
  deviceId: string;
  isOnline: boolean;
  totalRecords: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  deviceId,
  isOnline,
  totalRecords,
}) => {
  return (
    <aside className="ui-sidebar" aria-label="Main Navigation">
      {/* Brand Header */}
      <div className="ui-sidebar-brand">
        <div className="ui-brand-badge">
          <Navigation size={15} className="ui-brand-icon" />
        </div>
        <div className="ui-brand-text">
          <span className="ui-brand-title">SafeMe</span>
          <span className="ui-brand-version">Every Minutes Counts</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="ui-sidebar-nav">
        <div className="ui-nav-group">
          <span className="ui-nav-label">OPERATIONS</span>
          <ul className="ui-nav-list">
            <li>
              <a href="#live" className="ui-nav-item active" aria-current="page">
                <Activity size={15} className="ui-nav-icon" />
                <span className="ui-nav-text">Live Telemetry</span>
                <span className="ui-nav-pill">LIVE</span>
              </a>
            </li>
            <li>
              <a href="#fleet" className="ui-nav-item" onClick={(e) => e.preventDefault()}>
                <Layers size={15} className="ui-nav-icon" />
                <span className="ui-nav-text">Asset Fleet</span>
              </a>
            </li>
            <li>
              <a href="#geofence" className="ui-nav-item" onClick={(e) => e.preventDefault()}>
                <MapPin size={15} className="ui-nav-icon" />
                <span className="ui-nav-text">Geofences</span>
              </a>
            </li>
          </ul>
        </div>

        <div className="ui-nav-group">
          <span className="ui-nav-label">SYSTEM &amp; LOGS</span>
          <ul className="ui-nav-list">
            <li>
              <a href="#database" className="ui-nav-item" onClick={(e) => e.preventDefault()}>
                <Database size={15} className="ui-nav-icon" />
                <span className="ui-nav-text">SQLite Ledger</span>
                <span className="ui-nav-count tabular-nums">{totalRecords}</span>
              </a>
            </li>
            <li>
              <a href="#settings" className="ui-nav-item" onClick={(e) => e.preventDefault()}>
                <SlidersHorizontal size={15} className="ui-nav-icon" />
                <span className="ui-nav-text">Device Config</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hardware Link Diagnostics (Bottom) */}
      <div className="ui-sidebar-footer">
        <div className="ui-device-card">
          <div className="ui-device-header">
            <div className="ui-device-title-row">
              <span className={`ui-device-pip ${isOnline ? 'online' : 'offline'}`} />
              <span className="ui-device-id tabular-nums">{deviceId}</span>
            </div>
            <Wifi size={13} className="ui-wifi-icon" />
          </div>
          <div className="ui-device-meta">
            <span>NEO-7M &bull; FreeRTOS</span>
            <ChevronRight size={12} className="ui-arrow-icon" />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
