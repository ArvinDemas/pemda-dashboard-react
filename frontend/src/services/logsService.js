/**
 * Logs Service
 * API calls for access logs and activity history
 */

import api from './api';

/**
 * Get user's login history with filters
 */
export const getLogs = async (params = {}) => {
    const response = await api.get('/api/logs', { params });
    return response.data;
};

/**
 * Get logs statistics
 */
export const getLogsStats = async () => {
    const response = await api.get('/api/logs/stats');
    return response.data;
};

const logsService = {
    getLogs,
    getLogsStats,
    getStats: getLogsStats,
};

export default logsService;
