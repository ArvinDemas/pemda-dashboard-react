/**
 * API Service - Base Axios Configuration
 * Following frontend-developer and react-best-practices patterns
 * Handles Keycloak token injection, error handling, and request/response transformations
 */

import axios from 'axios';

// Create axios instance with base configuration
// Create axios instance with base configuration
// Support both localhost and IP-based access
const getBaseURL = () => {
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    // Auto-detect based on window location
    const hostname = window.location.hostname;
    return hostname === 'localhost' ? 'http://localhost:5000' : `http://${hostname}:5000`;
};

const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 30000, // 30 seconds
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Attach token from localStorage
api.interceptors.request.use(
    (config) => {
        // Skip auth for health checks
        if (config.url === '/health') {
            return config;
        }

        // Get token from localStorage (backend proxy auth)
        const accessToken = localStorage.getItem('access_token');

        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
            console.log('🔐 [API] Token injected from localStorage');
        } else {
            console.warn('⚠️ [API] No token in localStorage - request may fail');
        }

        return config;
    },
    (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');

                if (!refreshToken) {
                    console.error('[API] No refresh token available');
                    // Redirect to login
                    localStorage.clear();
                    window.location.href = '/';
                    return Promise.reject(error);
                }

                console.log('[API] Attempting token refresh...');

                // Call backend refresh endpoint using same baseURL logic
                const response = await axios.post(`${getBaseURL()}/api/auth/refresh`, {
                    refresh_token: refreshToken
                });

                const { access_token, refresh_token: newRefreshToken } = response.data;

                // Update localStorage
                localStorage.setItem('access_token', access_token);
                if (newRefreshToken) {
                    localStorage.setItem('refresh_token', newRefreshToken);
                }

                console.log('✅ [API] Token refreshed successfully');

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return api(originalRequest);

            } catch (refreshError) {
                console.error('[API] Token refresh failed:', refreshError);
                // Clear storage and redirect to login
                localStorage.clear();
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }

        // Handle specific error statuses
        const errorMessage = error.response?.data?.message || error.message;
        const errorStatus = error.response?.status;

        console.error(`[API] Error ${errorStatus}:`, errorMessage);

        // Format error for consistent handling
        const formattedError = {
            status: errorStatus,
            message: errorMessage,
            data: error.response?.data,
            originalError: error,
        };

        return Promise.reject(formattedError);
    }
);

/**
 * Helper function to handle file downloads
 */
export const downloadFile = async (url, filename) => {
    try {
        const response = await api.get(url, {
            responseType: 'blob', // Important for file downloads
        });

        // Create blob link to download
        const blob = new Blob([response.data]);
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename || 'download';
        link.click();

        // Cleanup
        window.URL.revokeObjectURL(link.href);

        return { success: true };
    } catch (error) {
        console.error('[API] Download error:', error);
        throw error;
    }
};

/**
 * Helper function to upload files with multipart/form-data
 */
export const uploadFile = async (url, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await api.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onUploadProgress) {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    onUploadProgress(percentCompleted);
                }
            },
        });

        return response.data;
    } catch (error) {
        console.error('[API] Upload error:', error);
        throw error;
    }
};

export default api;
