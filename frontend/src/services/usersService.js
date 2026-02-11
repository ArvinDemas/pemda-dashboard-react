/**
 * Users Service
 * API calls for user management
 */

import api from './api';

/**
 * Get all users
 */
export const getUsers = async (params = {}) => {
    const response = await api.get('/api/users', { params });
    return response.data;
};

/**
 * Get user by ID
 */
export const getUserById = async (id) => {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
};

/**
 * Update user
 */
export const updateUser = async (id, userData) => {
    const response = await api.put(`/api/users/${id}`, userData);
    return response.data;
};

/**
 * Get user roles
 */
export const getUserRoles = async (id) => {
    const response = await api.get(`/api/users/${id}/roles`);
    return response.data;
};

const usersService = {
    getUsers,
    getUserById,
    updateUser,
    getUserRoles,
};

export default usersService;
