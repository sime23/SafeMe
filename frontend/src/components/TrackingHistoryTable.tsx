import React, { useState, useMemo, memo } from 'react';
import {
  RotateCcw,
  EyeOff,
  Eye,
  Crosshair,
  Search,
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
} from 'lucide-react';
import type { TelemetryRecord } from '../types/tracking';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import './TrackingHistoryTable.css';

type SortField = 'id' | 'timestamp' | 'speed' | 'altitude' | 'satellites';
type SortDirection = 'asc' | 'desc';
type FixFilter = 'all' | '3d_only' | 'moving_only';

interface TrackingHistoryTableProps {
  records: TelemetryRecord[];
  isLoading: boolean;
  isReloading: boolean;
  showTrail: boolean;
  selectedRecordId?: number | null;
  onReloadHistory: () => void;
  onClearRoute: () => void;
  onToggleTrail: (show: boolean) => void;
  onSelectWaypoint: (record: TelemetryRecord) => void;
}

export const TrackingHistoryTable: React.FC<TrackingHistoryTableProps> = memo(
  ({
    records,
    isLoading,
    isReloading,
    showTrail,
    selectedRecordId,
    onReloadHistory,
    onClearRoute,
    onToggleTrail,
    onSelectWaypoint,
  }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<SortField>('id');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [pageSize, setPageSize] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [fixFilter, setFixFilter] = useState<FixFilter>('all');

    // Find the globally latest record ID in the current dataset
    const latestRecordId = useMemo(() => {
      if (records.length === 0) return null;
      return Math.max(...records.map((r) => r.id));
    }, [records]);

    // Handle sort toggles
    const handleSort = (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortField(field);
        setSortDirection('desc');
      }
      setCurrentPage(1);
    };

    // Filter, search, and sort records
    const processedRecords = useMemo(() => {
      let filtered = [...records];

      // Quick filter
      if (fixFilter === '3d_only') {
        filtered = filtered.filter((r) => r.satellites !== null && r.satellites >= 4);
      } else if (fixFilter === 'moving_only') {
        filtered = filtered.filter((r) => r.speed !== null && r.speed > 0.5);
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((r) => {
          const lat = r.latitude.toFixed(6);
          const lon = r.longitude.toFixed(6);
          const id = r.id.toString();
          const time = new Date(r.gpsTimestamp).toLocaleString().toLowerCase();
          return (
            lat.includes(term) ||
            lon.includes(term) ||
            id.includes(term) ||
            time.includes(term)
          );
        });
      }

      // Sort
      filtered.sort((a, b) => {
        let diff = 0;
        if (sortField === 'id') {
          diff = a.id - b.id;
        } else if (sortField === 'timestamp') {
          diff = new Date(a.gpsTimestamp).getTime() - new Date(b.gpsTimestamp).getTime();
        } else if (sortField === 'speed') {
          diff = (a.speed ?? 0) - (b.speed ?? 0);
        } else if (sortField === 'altitude') {
          diff = (a.altitude ?? 0) - (b.altitude ?? 0);
        } else if (sortField === 'satellites') {
          diff = (a.satellites ?? 0) - (b.satellites ?? 0);
        }
        return sortDirection === 'desc' ? -diff : diff;
      });

      return filtered;
    }, [records, searchTerm, sortField, sortDirection, fixFilter]);

    // Pagination calculations
    const totalRecords = processedRecords.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginatedRecords = useMemo(() => {
      const start = (safeCurrentPage - 1) * pageSize;
      return processedRecords.slice(start, start + pageSize);
    }, [processedRecords, safeCurrentPage, pageSize]);

    const startIndex = (safeCurrentPage - 1) * pageSize + 1;
    const endIndex = Math.min(safeCurrentPage * pageSize, totalRecords);

    const renderSortIcon = (field: SortField) => {
      if (sortField !== field) {
        return <ArrowUpDown size={12} className="sort-icon neutral" />;
      }
      return sortDirection === 'desc' ? (
        <ArrowDown size={12} className="sort-icon active" />
      ) : (
        <ArrowUp size={12} className="sort-icon active" />
      );
    };

    return (
      <div className="ledger-card">
        {/* Table Top Header Bar */}
        <div className="ledger-header-bar">
          <div className="ledger-title-group">
            <div className="ledger-title-row">
              <h3>Tracking Route Ledger</h3>
              <span className="ledger-total-badge tabular-nums">
                {records.length} {records.length === 1 ? 'waypoint' : 'waypoints'}
              </span>
            </div>
            <p className="ledger-subtitle">
              Time-series GPS fixes recorded by ESP32 &bull; Select a row to inspect waypoint on map
            </p>
          </div>

          {/* Action Strip */}
          <div className="ledger-actions-strip">
            {/* Toggle Polyline */}
            <button
              type="button"
              className={`trail-toggle-btn ${showTrail ? 'active' : ''}`}
              onClick={() => onToggleTrail(!showTrail)}
              title={showTrail ? 'Hide route line on map' : 'Show route line on map'}
            >
              {showTrail ? <Eye size={13} /> : <EyeOff size={13} />}
              <span>{showTrail ? 'Route Polyline: ON' : 'Route Polyline: OFF'}</span>
            </button>

            {/* Clear Route from Map Display */}
            <Button
              variant="outline"
              size="sm"
              icon={EyeOff}
              onClick={onClearRoute}
              disabled={records.length === 0}
              title="Clears polyline from map view without deleting records from SQLite database"
            >
              Clear Route on Map
            </Button>

            {/* Reload from Backend */}
            <Button
              variant="primary"
              size="sm"
              icon={RotateCcw}
              loading={isReloading}
              onClick={onReloadHistory}
              title="Query real history records from Express backend"
            >
              {isReloading ? 'Syncing...' : 'Reload Ledger'}
            </Button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="ledger-controls-toolbar">
          {/* Search Input */}
          <div className="ledger-search-wrap">
            <Input
              size="sm"
              icon={Search}
              placeholder="Search by coordinate, record ID, or time..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              onClear={() => setSearchTerm('')}
            />
          </div>

          {/* Quick Filter Segments */}
          <div className="ledger-filter-segments">
            <button
              type="button"
              className={`filter-segment-btn ${fixFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setFixFilter('all');
                setCurrentPage(1);
              }}
            >
              All Fixes ({records.length})
            </button>
            <button
              type="button"
              className={`filter-segment-btn ${fixFilter === '3d_only' ? 'active' : ''}`}
              onClick={() => {
                setFixFilter('3d_only');
                setCurrentPage(1);
              }}
            >
              <Filter size={11} />
              <span>3D Locks Only</span>
            </button>
            <button
              type="button"
              className={`filter-segment-btn ${fixFilter === 'moving_only' ? 'active' : ''}`}
              onClick={() => {
                setFixFilter('moving_only');
                setCurrentPage(1);
              }}
            >
              <span>In Motion</span>
            </button>
          </div>

          {/* Page Size Selector */}
          <div className="ledger-page-size-wrap">
            <span className="control-caption">Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ledger-select"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* Main Table Content */}
        {isLoading ? (
          <div className="ledger-loading-state">
            <div className="ledger-spinner" />
            <span>Retrieving GPS waypoints from SQLite database...</span>
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={History}
            title="Route Ledger Cleared from Map"
            description="The route polyline has been cleared from map display. Your historical telemetry points remain safely stored in the backend SQLite database."
            action={
              <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onReloadHistory}>
                Restore Route Ledger
              </Button>
            }
          />
        ) : processedRecords.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No Matching Waypoints Found"
            description={`No GPS records match the search filter "${searchTerm}".`}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFixFilter('all');
                }}
              >
                Clear Search &amp; Filters
              </Button>
            }
          />
        ) : (
          <div className="ledger-table-wrap">
            <table className="ledger-table" role="grid">
              <thead>
                <tr>
                  {/* Record ID */}
                  <th
                    className="col-sortable col-align-left"
                    style={{ width: '100px' }}
                    onClick={() => handleSort('id')}
                    title="Sort by Record ID"
                  >
                    <div className="th-content">
                      <span>RECORD ID</span>
                      {renderSortIcon('id')}
                    </div>
                  </th>

                  {/* Timestamp */}
                  <th
                    className="col-sortable col-align-left"
                    style={{ width: '150px' }}
                    onClick={() => handleSort('timestamp')}
                    title="Sort by GPS Timestamp"
                  >
                    <div className="th-content">
                      <span>GPS TIMESTAMP</span>
                      {renderSortIcon('timestamp')}
                    </div>
                  </th>

                  {/* Coordinates */}
                  <th className="col-align-left">
                    <span>COORDINATES (LAT, LON)</span>
                  </th>

                  {/* Speed */}
                  <th
                    className="col-sortable col-align-right"
                    style={{ width: '105px' }}
                    onClick={() => handleSort('speed')}
                    title="Sort by Ground Speed"
                  >
                    <div className="th-content th-right">
                      <span>SPEED</span>
                      {renderSortIcon('speed')}
                    </div>
                  </th>

                  {/* Altitude */}
                  <th
                    className="col-sortable col-align-right"
                    style={{ width: '95px' }}
                    onClick={() => handleSort('altitude')}
                    title="Sort by Altitude"
                  >
                    <div className="th-content th-right">
                      <span>ALTITUDE</span>
                      {renderSortIcon('altitude')}
                    </div>
                  </th>

                  {/* Heading */}
                  <th className="col-align-center" style={{ width: '90px' }}>
                    <span>HEADING</span>
                  </th>

                  {/* Satellites */}
                  <th
                    className="col-sortable col-align-center"
                    style={{ width: '85px' }}
                    onClick={() => handleSort('satellites')}
                    title="Sort by Satellites in Fix"
                  >
                    <div className="th-content th-center">
                      <span>SATS</span>
                      {renderSortIcon('satellites')}
                    </div>
                  </th>

                  {/* HDOP */}
                  <th className="col-align-right" style={{ width: '75px' }}>
                    <span>HDOP</span>
                  </th>

                  {/* Action */}
                  <th className="col-align-right" style={{ width: '95px' }}>
                    <span>MAP ACTION</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((item) => {
                  const isSelected = selectedRecordId === item.id;
                  const isLatest = latestRecordId === item.id;
                  const dateObj = new Date(item.gpsTimestamp);
                  const timeStr = dateObj.toLocaleTimeString();
                  const dateStr = dateObj.toLocaleDateString();

                  return (
                    <tr
                      key={item.id}
                      className={`ledger-row ${isSelected ? 'row-selected' : ''}`}
                      onClick={() => onSelectWaypoint(item)}
                    >
                      {/* ID & Latest Badge */}
                      <td className="col-id col-align-left">
                        <span className="id-badge-text tabular-nums">#{item.id}</span>
                        {isLatest && (
                          <Badge variant="success" dot pulse>
                            LATEST
                          </Badge>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="col-time col-align-left">
                        <span className="time-primary tabular-nums">{timeStr}</span>
                        <span className="date-secondary tabular-nums">{dateStr}</span>
                      </td>

                      {/* Coordinates */}
                      <td className="col-coords col-align-left">
                        <span className="coords-monospace tabular-nums">
                          {item.latitude.toFixed(6)}&deg; N, {item.longitude.toFixed(6)}&deg; E
                        </span>
                      </td>

                      {/* Speed */}
                      <td className="col-speed col-align-right tabular-nums">
                        <span className="val-bold">
                          {item.speed !== null ? item.speed.toFixed(1) : '0.0'}
                        </span>
                        <span className="unit-text">km/h</span>
                      </td>

                      {/* Altitude */}
                      <td className="col-alt col-align-right tabular-nums">
                        <span className="val-bold">
                          {item.altitude !== null ? item.altitude.toFixed(0) : 'N/A'}
                        </span>
                        <span className="unit-text">m</span>
                      </td>

                      {/* Heading */}
                      <td className="col-heading col-align-center tabular-nums">
                        {item.heading !== null ? `${item.heading.toFixed(0)}°` : '0°'}
                      </td>

                      {/* Satellites */}
                      <td className="col-sats col-align-center">
                        <Badge
                          variant={
                            item.satellites && item.satellites >= 4
                              ? 'success'
                              : 'warning'
                          }
                        >
                          <span className="tabular-nums">{item.satellites ?? '0'}</span>
                        </Badge>
                      </td>

                      {/* HDOP */}
                      <td className="col-hdop col-align-right tabular-nums">
                        {item.hdop !== null ? item.hdop.toFixed(2) : 'N/A'}
                      </td>

                      {/* Action */}
                      <td className="col-action col-align-right">
                        <button
                          type="button"
                          className="focus-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectWaypoint(item);
                          }}
                          title="Focus and highlight this waypoint on map"
                        >
                          <Crosshair size={12} />
                          <span>Focus</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {!isLoading && totalRecords > 0 && (
          <div className="ledger-pagination-bar">
            {/* Summary */}
            <div className="pagination-summary">
              Showing <strong className="tabular-nums">{startIndex}</strong>&ndash;
              <strong className="tabular-nums">{endIndex}</strong> of{' '}
              <strong className="tabular-nums">{totalRecords}</strong> waypoints
            </div>

            {/* Pagination Controls */}
            <div className="pagination-controls">
              {/* First Page */}
              <button
                type="button"
                className="pagination-nav-btn"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                title="First Page"
                aria-label="First Page"
              >
                <ChevronsLeft size={14} />
              </button>

              {/* Previous Page */}
              <button
                type="button"
                className="pagination-nav-btn"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
                aria-label="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Current Page Display */}
              <span className="page-indicator tabular-nums">
                Page <strong>{safeCurrentPage}</strong> of <strong>{totalPages}</strong>
              </span>

              {/* Next Page */}
              <button
                type="button"
                className="pagination-nav-btn"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next Page"
                aria-label="Next Page"
              >
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                type="button"
                className="pagination-nav-btn"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Last Page"
                aria-label="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

TrackingHistoryTable.displayName = 'TrackingHistoryTable';
export default TrackingHistoryTable;
