/**
 * Profile Service
 * API calls for user profile management
 */

import api from './api';

/**
 * Get user profile
 */
export const getProfile = async () => {
    const response = await api.get('/api/profile');
    return response.data;
};

/**
 * Update user profile (name, email)
 */
export const updateProfile = async (profileData) => {
    const response = await api.put('/api/profile', profileData);
    return response.data;
};

/**
 * Change password
 */
export const changePassword = async (passwordData) => {
    const response = await api.put('/api/profile/password', passwordData);
    return response.data;
};

const profileService = {
    getProfile,
    updateProfile,
    changePassword,
};

export default profileService;
