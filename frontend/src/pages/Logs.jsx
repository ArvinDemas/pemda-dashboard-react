/**
 * Logs Page
 * Activity logs with filters and pagination
 * Following frontend-developer and ui-ux-pro-max patterns
 */

import React, { useState, useEffect } from 'react';
import { ClockCounterClockwise, CheckCircle, XCircle, FunnelSimple } from 'phosphor-react';
import logsService from '../services/logsService';
import Loading from '../components/shared/Loading';
import Pagination from '../components/shared/Pagination';
import { showError } from '../hooks/useToast';
import { format } from 'date-fns';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
  });

  // Load logs on mount and when filters/page change
  useEffect(() => {
    loadLogs();
    loadStats();
  }, [currentPage, filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.status !== 'all' && { success: filters.status === 'success' }),
      };

      const data = await logsService.getLogs(params);
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      showError('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await logsService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: 'all',
    });
    setCurrentPage(1);
  };

  return (
    <div className="logs-page page-wrapper">
      <div className="page-header">
        <div className="header-left">
          <h2>Activity Logs</h2>
          <p>View your login history and activity</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <ClockCounterClockwise size={24} weight="fill" />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalLogins || 0}</span>
              <span className="stat-label">Total Logins</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <CheckCircle size={24} weight="fill" />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.successfulLogins || 0}</span>
              <span className="stat-label">Successful</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger">
              <XCircle size={24} weight="fill" />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.failedLogins || 0}</span>
              <span className="stat-label">Failed</span>
            </div>
          </div>
          {stats.lastLogin && (
            <div className="stat-card">
              <div className="stat-icon secondary">
                <ClockCounterClockwise size={24} weight="fill" />
              </div>
              <div className="stat-info">
                <span className="stat-value">
                  {format(new Date(stats.lastLogin), 'MMM dd, HH:mm')}
                </span>
                <span className="stat-label">Last Login</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="logs-filters">
        <div className="filter-group">
          <label htmlFor="startDate">From Date</label>
          <input
            type="date"
            id="startDate"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="endDate">To Date</label>
          <input
            type="date"
            id="endDate"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">All</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <button onClick={resetFilters} className="btn-secondary">
          <FunnelSimple size={18} />
          <span>Reset</span>
        </button>
      </div>

      {/* Logs Table */}
      {loading ? (
        <Loading message="Loading logs..." />
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <ClockCounterClockwise size={64} weight="light" />
          <h3>No logs found</h3>
          <p>No activity logs match your filters</p>
        </div>
      ) : (
        <>
          <div className="dashboard-card">
            <div className="logs-table-container">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Device</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>
                        <div className="log-datetime">
                          <span className="log-date">
                            {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                          </span>
                          <span className="log-time">
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                      </td>
                      <td>
                        {log.success ? (
                          <span className="status-badge success">
                            <CheckCircle size={16} weight="fill" />
                            Success
                          </span>
                        ) : (
                          <span className="status-badge danger">
                            <XCircle size={16} weight="fill" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="log-ip">{log.ip || log.ipAddress || 'Unknown'}</span>
                      </td>
                      <td>
                        <div className="log-device">
                          <span className="device-name">
                            {log.metadata?.device === 'mobile' || log.metadata?.device === 'Mobile' ? '📱 Mobile' : '💻 Desktop'}
                          </span>
                          <span className="device-details">
                            {log.metadata?.browser || 'Unknown'}
                            {log.metadata?.os ? ` · ${log.metadata.os}` : ''}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="log-location">
                          {log.metadata?.location?.city
                            ? `${log.metadata.location.city}${log.metadata.location.country ? ', ' + log.metadata.location.country : ''}`
                            : (log.ip?.startsWith('10.') || log.ip?.startsWith('192.168.') || log.ip === '127.0.0.1' || log.ip === '::1'
                              ? 'Local Network'
                              : 'Unknown')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};

export default Logs;
