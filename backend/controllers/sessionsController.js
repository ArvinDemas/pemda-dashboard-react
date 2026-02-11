/**
 * Sessions Controller
 * Manage Keycloak user sessions
 */

const axios = require('axios');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://10.7.183.46:8080';
const REALM = process.env.KEYCLOAK_REALM || 'Jogja-SSO';

/**
 * Get Keycloak admin token
 * Using Jogja-SSO realm directly (user-verified working configuration)
 */
async function getAdminToken() {
    try {
        const response = await axios.post(
            `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
            new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: process.env.KEYCLOAK_ADMIN_CLIENT || 'pemda-dashboard',
                client_secret: process.env.KEYCLOAK_ADMIN_SECRET || ''
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error('Failed to get admin token:', error.message);
        throw new Error('Keycloak admin authentication failed');
    }
}

/**
 * Get user's active sessions
 * GET /api/sessions
 */
exports.getSessions = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('📊 [Sessions] Fetching for userId:', userId);

        // Get admin token
        const adminToken = await getAdminToken();

        // Get user sessions from Keycloak
        const response = await axios.get(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/sessions`,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            }
        );

        console.log('📊 [Sessions] Found', response.data.length, 'sessions');

        const sessions = response.data.map(session => {
            const ip = session.ipAddress || '';
            // Fallback for localhost/local IPs
            let location = 'Unknown';
            if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
                location = 'Yogyakarta (Local)';
            }

            return {
                id: session.id,
                ipAddress: ip,
                location: location,
                start: new Date(session.start),
                lastAccess: new Date(session.lastAccess),
                clients: session.clients || {},
                current: session.id === req.user.sessionId
            };
        });

        res.json({ sessions });
    } catch (error) {
        console.error('❌ [Sessions] Error:', error.message);

        // If Keycloak is unavailable, return mock data in dev mode
        if (process.env.NODE_ENV === 'development') {
            return res.json({
                sessions: [{
                    id: req.user.sessionId || 'dev-session-001',
                    ipAddress: req.ip || '127.0.0.1',
                    location: 'Yogyakarta (Local)',
                    start: new Date(),
                    lastAccess: new Date(),
                    clients: { 'pemda-dashboard': 'active' },
                    current: true
                }],
                note: 'Development mode - mock data'
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch sessions'
        });
    }
};

/**
 * Terminate specific session
 * DELETE /api/sessions/:sessionId
 */
exports.terminateSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        // Prevent terminating current session
        if (sessionId === req.user.sessionId) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Cannot terminate current session. Use logout instead.'
            });
        }

        // Get admin token
        const adminToken = await getAdminToken();

        // Terminate session via Keycloak Admin API
        await axios.delete(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/sessions/${sessionId}`,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            }
        );

        // Log the session termination
        const LoginLog = require('../models/LoginLog');
        await LoginLog.logEvent({
            userId,
            action: 'SESSION_TERMINATED',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            sessionId: req.user.sessionId,
            metadata: { terminatedSessionId: sessionId },
            success: true
        });

        res.json({
            message: 'Session terminated successfully'
        });
    } catch (error) {
        console.error('Terminate session error:', error.message);

        if (error.response && error.response.status === 404) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Session not found'
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to terminate session'
        });
    }
};

/**
 * Terminate all sessions except current
 * POST /api/sessions/terminate-all
 */
exports.terminateAllSessions = async (req, res) => {
    try {
        const userId = req.user.id;
        const currentSessionId = req.user.sessionId;

        // Get admin token
        const adminToken = await getAdminToken();

        // Get all user sessions
        const sessionsResponse = await axios.get(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/sessions`,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            }
        );

        const sessions = sessionsResponse.data;
        let terminatedCount = 0;

        // Terminate all except current
        for (const session of sessions) {
            if (session.id !== currentSessionId) {
                try {
                    await axios.delete(
                        `${KEYCLOAK_URL}/admin/realms/${REALM}/sessions/${session.id}`,
                        {
                            headers: {
                                Authorization: `Bearer ${adminToken}`
                            }
                        }
                    );
                    terminatedCount++;
                } catch (err) {
                    console.warn(`Failed to terminate session ${session.id}:`, err.message);
                }
            }
        }

        // Log the action
        const LoginLog = require('../models/LoginLog');
        await LoginLog.logEvent({
            userId,
            action: 'SESSION_TERMINATED',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            sessionId: currentSessionId,
            metadata: { terminatedCount },
            success: true
        });

        res.json({
            message: `Terminated ${terminatedCount} session(s)`,
            terminatedCount
        });
    } catch (error) {
        console.error('Terminate all sessions error:', error.message);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to terminate sessions'
        });
    }
};

