/**
 * Sessions Service
 * API calls for Keycloak session management
 */

import api from './api';

/**
 * Get active sessions
 */
export const getSessions = async () => {
    const response = await api.get('/api/sessions');
    return response.data;
};

/**
 * Terminate specific session
 */
export const terminateSession = async (sessionId) => {
    const response = await api.delete(`/api/sessions/${sessionId}`);
    return response.data;
};

/**
 * Terminate all sessions except current
 */
export const terminateAllSessions = async () => {
    const response = await api.post('/api/sessions/terminate-all');
    return response.data;
};

const sessionsService = {
    getSessions,
    terminateSession,
    terminateAllSessions,
};

export default sessionsService;
