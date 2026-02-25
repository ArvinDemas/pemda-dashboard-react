/**
 * Sessions Page
 * Manage active Keycloak sessions
 * Following frontend-developer and ui-ux-pro-max patterns
 */

import React, { useState, useEffect } from 'react';
import { Desktop, DeviceMobile, SignOut, WarningCircle } from 'phosphor-react';
import sessionsService from '../services/sessionsService';
import Loading from '../components/shared/Loading';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { showSuccess, showError } from '../hooks/useToast';
import { format, formatDistanceToNow } from 'date-fns';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminateConfirm, setTerminateConfirm] = useState(null);
  const [terminateAllConfirm, setTerminateAllConfirm] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await sessionsService.getSessions();
      setSessions(data.sessions || []);
    } catch (error) {
      showError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  // Terminate specific session
  const handleTerminateSession = async () => {
    if (!terminateConfirm) return;

    try {
      await sessionsService.terminateSession(terminateConfirm.id);
      showSuccess('Session terminated successfully');
      setTerminateConfirm(null);

      // If terminating current session, perform full logout
      if (terminateConfirm.current) {
        const refreshToken = localStorage.getItem('refresh_token');
        localStorage.clear();

        const apiUrl = window.location.hostname === 'localhost'
          ? 'http://localhost:5000'
          : `http://${window.location.hostname}:5000`;

        if (refreshToken) {
          fetch(`${apiUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
          }).catch(() => { });
        }

        setTimeout(() => {
          window.location.href = '/logout-success';
        }, 1000);
      } else {
        loadSessions();
      }
    } catch (error) {
      showError('Failed to terminate session');
    }
  };

  // Terminate all sessions (including current)
  const handleTerminateAllSessions = async () => {
    try {
      await sessionsService.terminateAllSessions();
      showSuccess('Semua sesi berhasil diterminasi');
      setTerminateAllConfirm(false);

      // Also logout current user since all sessions are terminated
      const refreshToken = localStorage.getItem('refresh_token');
      localStorage.clear();

      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : `http://${window.location.hostname}:5000`;

      if (refreshToken) {
        fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        }).catch(() => { });
      }

      setTimeout(() => {
        window.location.href = '/logout-success';
      }, 1000);
    } catch (error) {
      showError('Failed to terminate sessions');
    }
  };

  // Get device icon
  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return <Desktop size={32} weight="fill" />;
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <DeviceMobile size={32} weight="fill" />;
    }
    return <Desktop size={32} weight="fill" />;
  };

  // Parse user agent
  const parseUserAgent = (userAgent) => {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown' };

    let browser = 'Unknown';
    let os = 'Unknown';

    // Browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // OS detection
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    return { browser, os };
  };

  return (
    <div className="sessions-page page-wrapper">
      <div className="page-header">
        <div className="header-left">
          <h2>Active Sessions</h2>
          <p>Manage your active login sessions</p>
        </div>
        {sessions.length > 1 && (
          <button
            className="btn-danger-outline"
            onClick={() => setTerminateAllConfirm(true)}
          >
            <SignOut size={20} weight="bold" />
            <span>Terminate Semua Sesi</span>
          </button>
        )}
      </div>

      {/* Info Alert */}
      <div className="info-alert">
        <WarningCircle size={20} weight="fill" />
        <div>
          <strong>Active Sessions</strong>
          <p>These are the devices currently logged into your account. If you see an unfamiliar session, terminate it immediately and change your password.</p>
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <Loading message="Loading sessions..." />
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <Desktop size={64} weight="light" />
          <h3>No active sessions</h3>
          <p>You don't have any active sessions</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map((session) => {
            const { browser, os } = parseUserAgent(session.userAgent);
            const isCurrent = session.current || session.id === sessions[0]?.id;

            return (
              <div key={session.id} className={`session-card ${isCurrent ? 'current' : ''}`}>
                <div className="session-icon">
                  {getDeviceIcon(session.userAgent)}
                </div>

                <div className="session-info">
                  <div className="session-header">
                    <h4>{browser} on {os}</h4>
                    {isCurrent && (
                      <span className="current-badge">Current Session</span>
                    )}
                  </div>

                  <div className="session-details">
                    <div className="session-detail">
                      <span className="detail-label">IP Address:</span>
                      <span className="detail-value">{session.ipAddress || 'Unknown'}</span>
                    </div>

                    <div className="session-detail">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{session.location || 'Unknown'}</span>
                    </div>

                    {session.start && (
                      <div className="session-detail">
                        <span className="detail-label">Started:</span>
                        <span className="detail-value">
                          {formatDistanceToNow(new Date(session.start), { addSuffix: true })}
                        </span>
                      </div>
                    )}

                    {session.lastAccess && (
                      <div className="session-detail">
                        <span className="detail-label">Last Active:</span>
                        <span className="detail-value">
                          {formatDistanceToNow(new Date(session.lastAccess), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="session-actions">
                  <button
                    className="btn-danger-outline"
                    onClick={() => setTerminateConfirm({ ...session, current: isCurrent })}
                  >
                    <SignOut size={18} />
                    <span>Terminate</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Terminate Single Session Dialog */}
      <ConfirmDialog
        isOpen={!!terminateConfirm}
        title={terminateConfirm?.current ? "Terminate Current Session?" : "Terminate Session?"}
        message={
          terminateConfirm?.current
            ? "You are about to terminate your current session. You will be logged out."
            : "Are you sure you want to terminate this session?"
        }
        variant="danger"
        confirmText="Terminate"
        onConfirm={handleTerminateSession}
        onCancel={() => setTerminateConfirm(null)}
      />

      {/* Terminate All Sessions Dialog */}
      <ConfirmDialog
        isOpen={terminateAllConfirm}
        title="Terminate All Other Sessions?"
        message="This will log you out from all devices except this one. Are you sure?"
        variant="warning"
        confirmText="Terminate All"
        onConfirm={handleTerminateAllSessions}
        onCancel={() => setTerminateAllConfirm(false)}
      />
    </div>
  );
};

export default Sessions;
