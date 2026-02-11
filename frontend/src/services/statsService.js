/**
 * Stats Service
 * Fetch dashboard statistics from backend
 * FIXED: All paths must include /api prefix (baseURL is http://localhost:5000)
 */

import api from './api';

const statsService = {
    /**
     * Get notes statistics
     */
    getNotesStats: async () => {
        try {
            console.log('📊 [StatsService] Fetching notes stats...');
            const response = await api.get('/api/notes/stats');
            console.log('📊 [StatsService] Notes stats response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ [StatsService] Failed to load notes stats:', error);
            return { total: 0, recent: [] };
        }
    },

    /**
     * Get documents statistics
     */
    getDocumentsStats: async () => {
        try {
            console.log('📊 [StatsService] Fetching documents stats...');
            const response = await api.get('/api/documents/stats');
            console.log('📊 [StatsService] Documents stats response:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ [StatsService] Failed to load documents stats:', error);
            return { total: 0, totalSize: 0 };
        }
    },

    /**
     * Get sessions statistics
     */
    getSessionsStats: async () => {
        try {
            console.log('📊 [StatsService] Fetching sessions stats...');
            const response = await api.get('/api/sessions');
            console.log('📊 [StatsService] Sessions response:', response.data);
            return { active: response.data.sessions?.length || 0 };
        } catch (error) {
            console.error('❌ [StatsService] Failed to load sessions stats:', error);
            return { active: 0 };
        }
    }
};

export default statsService;
