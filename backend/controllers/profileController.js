/**
 * Profile Controller
 * User profile management via Keycloak Admin API
 * Following auth-implementation-patterns: secure credential handling
 */

const axios = require('axios');
const LoginLog = require('../models/LoginLog');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
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
 * Get user profile
 * GET /api/profile
 */
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get admin token
        const adminToken = await getAdminToken();

        // Get user details from Keycloak
        const response = await axios.get(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}`,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            }
        );

        const user = response.data;

        // Return safe user data
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            emailVerified: user.emailVerified,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
            enabled: user.enabled,
            createdTimestamp: user.createdTimestamp
        });
    } catch (error) {
        console.error('Get profile error:', error.message);

        // Return user info from token if Keycloak unavailable
        if (req.user) {
            return res.json({
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                displayName: req.user.firstName && req.user.lastName
                    ? `${req.user.firstName} ${req.user.lastName}`
                    : req.user.username
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch profile'
        });
    }
};

/**
 * Update user profile
 * PUT /api/profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, email } = req.body;

        // Validation
        if (email && !isValidEmail(email)) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid email format'
            });
        }

        // Get admin token
        const adminToken = await getAdminToken();

        // Prepare update data
        const updateData = {};
        if (firstName !== undefined) updateData.firstName = firstName.trim();
        if (lastName !== undefined) updateData.lastName = lastName.trim();
        if (email !== undefined) updateData.email = email.trim();

        // Update user in Keycloak
        await axios.put(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}`,
            updateData,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            message: 'Profile updated successfully',
            updated: updateData
        });
    } catch (error) {
        console.error('Update profile error:', error.message);

        if (error.response && error.response.status === 409) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Email already in use'
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update profile'
        });
    }
};

/**
 * Change user password
 * PUT /api/profile/password
 */
exports.changePassword = async (req, res) => {
    try {
        // Extract userId from authenticated user (set by auth middleware)
        const userId = req.user.id; // This is payload.sub from JWT
        const { newPassword } = req.body;

        console.log('🔐 Password change requested for user:', req.user.username, 'ID:', userId);

        // Validate new password
        if (!newPassword || newPassword.length < 8) {
            console.log('❌ Password validation failed: too short');
            return res.status(400).json({
                error: 'Invalid password',
                message: 'New password must be at least 8 characters long'
            });
        }

        // Get admin token for Keycloak Admin API
        console.log('🔑 Getting Keycloak admin token...');
        const adminToken = await getAdminToken();
        console.log('✅ Admin token obtained');

        // Update password via Keycloak Admin API
        console.log(`🔄 Resetting password for user ${userId}...`);
        console.log(`   Keycloak URL: ${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/reset-password`);

        await axios.put(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/reset-password`,
            {
                type: 'password',
                value: newPassword,
                temporary: false  // User won't need to change on next login
            },
            {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Password updated successfully for user:', req.user.username);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        // Detailed error logging
        console.error('❌ Change password error:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            userId: req.user?.id,
            username: req.user?.username
        });

        // Handle specific errors
        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account not found in Keycloak'
            });
        }

        if (error.response?.status === 403) {
            return res.status(403).json({
                error: 'Permission denied',
                message: 'Insufficient permissions to update password'
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update password',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper: Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Helper: Password strength validation
function isStrongPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
}
