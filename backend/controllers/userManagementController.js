/**
 * User Management Controller (Super Admin)
 * Comprehensive user administration via Keycloak Admin API
 * Features: List users, reset passwords, hard delete with data cleanup
 */

const axios = require('axios');
const Document = require('../models/Document');
const Note = require('../models/Note');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const REALM = process.env.KEYCLOAK_REALM || 'PemdaSSO';

/**
 * Get Keycloak admin token
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
 * Get user's federated identities (social logins)
 */
async function getUserIdentityProviders(userId, adminToken) {
    try {
        const response = await axios.get(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/federated-identity`,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            }
        );
        return response.data || [];
    } catch (error) {
        console.error('Failed to get federated identities:', error.message);
        return [];
    }
}

/**
 * List all users
 * GET /api/admin/users
 */
exports.listUsers = async (req, res) => {
    try {
        console.log('📋 Fetching all users from Keycloak...');

        // Get admin token
        const adminToken = await getAdminToken();

        // Get all users from Keycloak
        const response = await axios.get(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                },
                params: {
                    max: 1000 // Adjust as needed
                }
            }
        );

        const users = response.data;

        // Enrich user data with identity provider info
        const enrichedUsers = await Promise.all(
            users.map(async (user) => {
                // Get federated identities (social logins)
                const federatedIdentities = await getUserIdentityProviders(user.id, adminToken);

                // Determine primary identity provider
                let identityProvider = 'keycloak'; // Default
                if (federatedIdentities.length > 0) {
                    identityProvider = federatedIdentities[0].identityProvider;
                }

                return {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    displayName: user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.username,
                    enabled: user.enabled,
                    createdTimestamp: user.createdTimestamp,
                    identityProvider: identityProvider,
                    linkedAccounts: federatedIdentities.map(fi => ({
                        provider: fi.identityProvider,
                        userId: fi.userId,
                        userName: fi.userName
                    }))
                };
            })
        );

        console.log(`✅ Retrieved ${enrichedUsers.length} users`);

        res.json({
            users: enrichedUsers,
            total: enrichedUsers.length
        });

    } catch (error) {
        console.error('❌ List users error:', error.message);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch users'
        });
    }
};

/**
 * Get single user details
 * GET /api/admin/users/:id
 */
exports.getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Fetching details for user:', id);

        const adminToken = await getAdminToken();

        // Get user from Keycloak
        const response = await axios.get(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${id}`,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            }
        );

        const user = response.data;

        // Get federated identities
        const federatedIdentities = await getUserIdentityProviders(id, adminToken);

        // Get user's sessions
        let sessions = [];
        try {
            const sessionsResponse = await axios.get(
                `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${id}/sessions`,
                {
                    headers: {
                        Authorization: `Bearer ${adminToken}`
                    }
                }
            );
            sessions = sessionsResponse.data;
        } catch (err) {
            console.warn('Could not fetch sessions:', err.message);
        }

        // Get user's documents and notes count from MongoDB
        const [documentCount, noteCount] = await Promise.all([
            Document.count({ where: { userId: id } }).catch(() => 0),
            Note.count({ where: { userId: id } }).catch(() => 0)
        ]);

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            emailVerified: user.emailVerified,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.username,
            enabled: user.enabled,
            createdTimestamp: user.createdTimestamp,
            identityProvider: federatedIdentities.length > 0 ? federatedIdentities[0].identityProvider : 'keycloak',
            linkedAccounts: federatedIdentities.map(fi => ({
                provider: fi.identityProvider,
                userId: fi.userId,
                userName: fi.userName
            })),
            activeSessions: sessions.length,
            stats: {
                documents: documentCount,
                notes: noteCount
            }
        });

    } catch (error) {
        console.error('❌ Get user details error:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found'
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch user details'
        });
    }
};

/**
 * Reset user password (Admin)
 * PUT /api/admin/users/:id/reset-password
 */
exports.resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        console.log('🔐 Admin resetting password for user:', id);

        // Validate password
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                error: 'Invalid password',
                message: 'Password must be at least 8 characters long'
            });
        }

        const adminToken = await getAdminToken();

        // Reset password via Keycloak Admin API
        await axios.put(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${id}/reset-password`,
            {
                type: 'password',
                value: newPassword,
                temporary: false // Not temporary - user can use immediately
            },
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Password reset successful for user:', id);
        console.log('👤 Reset performed by admin:', req.user.username);

        res.json({
            success: true,
            message: 'Password reset successfully',
            userId: id
        });

    } catch (error) {
        console.error('❌ Reset password error:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found'
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to reset password'
        });
    }
};

/**
 * Create new user in Keycloak
 * POST /api/admin/users
 */
exports.createUser = async (req, res) => {
    try {
        const { username, email, firstName, lastName, password, enabled = true } = req.body;

        console.log('➕ Creating new user:', username);

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Username, email, dan password wajib diisi'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Password minimal 8 karakter'
            });
        }

        const adminToken = await getAdminToken();

        // Step 1: Create user in Keycloak with CONFIGURE_TOTP required action
        const createResponse = await axios.post(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users`,
            {
                username: username.trim(),
                email: email.trim(),
                firstName: (firstName || '').trim(),
                lastName: (lastName || '').trim(),
                enabled: enabled,
                emailVerified: true,
                requiredActions: ['CONFIGURE_TOTP']
            },
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Get new user ID from Location header
        const locationHeader = createResponse.headers['location'] || createResponse.headers['Location'];
        const newUserId = locationHeader ? locationHeader.split('/').pop() : null;

        if (!newUserId) {
            // Try to find user by username
            const searchResponse = await axios.get(
                `${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${encodeURIComponent(username)}&exact=true`,
                {
                    headers: { Authorization: `Bearer ${adminToken}` }
                }
            );
            if (searchResponse.data.length === 0) {
                throw new Error('User created but could not retrieve ID');
            }
            var userId = searchResponse.data[0].id;
        } else {
            var userId = newUserId;
        }

        // Step 2: Set password
        await axios.put(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/reset-password`,
            {
                type: 'password',
                value: password,
                temporary: false
            },
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ User created successfully:', username, 'ID:', userId);

        res.status(201).json({
            success: true,
            message: 'User berhasil dibuat',
            user: {
                id: userId,
                username: username.trim(),
                email: email.trim(),
                firstName: (firstName || '').trim(),
                lastName: (lastName || '').trim(),
                enabled: enabled
            }
        });

    } catch (error) {
        console.error('❌ Create user error:', error.message);

        if (error.response?.status === 409) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Username atau email sudah digunakan'
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: error.response?.data?.errorMessage || 'Gagal membuat user'
        });
    }
};

/**
 * Hard delete user (from Keycloak AND MongoDB)
 * DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🗑️ Hard deleting user:', id);
        console.log('👤 Deletion requested by admin:', req.user.username);

        // Prevent self-deletion
        if (id === req.user.id) {
            return res.status(400).json({
                error: 'Self Deletion Not Allowed',
                message: 'You cannot delete your own account'
            });
        }

        const adminToken = await getAdminToken();

        // Step 1: Get user details first (for logging)
        let username = 'unknown';
        try {
            const userResponse = await axios.get(
                `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${adminToken}`
                    }
                }
            );
            username = userResponse.data.username;
        } catch (err) {
            console.warn('Could not fetch user details:', err.message);
        }

        // Step 2: Delete all user's documents from DB
        console.log('📄 Deleting user documents...');
        const deletedDocs = await Document.destroy({ where: { userId: id } });
        console.log(`✅ Deleted ${deletedDocs} documents`);

        // Step 3: Delete all user's notes from DB
        console.log('📝 Deleting user notes...');
        const deletedNotes = await Note.destroy({ where: { userId: id } });
        console.log(`✅ Deleted ${deletedNotes} notes`);

        // Step 4: Delete user from Keycloak
        console.log('👤 Deleting user from Keycloak...');
        await axios.delete(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${id}`,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            }
        );

        console.log('✅ User deleted successfully from Keycloak');
        console.log(`📊 Cleanup summary - User: ${username}, Documents: ${deletedDocs}, Notes: ${deletedNotes}`);

        res.json({
            success: true,
            message: 'User and all associated data deleted successfully',
            deletedUser: {
                id: id,
                username: username
            },
            deletedData: {
                documents: deletedDocs,
                notes: deletedNotes
            }
        });

    } catch (error) {
        console.error('❌ Delete user error:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found'
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete user'
        });
    }
};

/**
 * Update user (basic info)
 * PUT /api/admin/users/:id
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, enabled } = req.body;

        console.log('✏️ Admin updating user:', id);

        const adminToken = await getAdminToken();

        // Prepare update data
        const updateData = {};
        if (firstName !== undefined) updateData.firstName = firstName.trim();
        if (lastName !== undefined) updateData.lastName = lastName.trim();
        if (email !== undefined) updateData.email = email.trim();
        if (enabled !== undefined) updateData.enabled = Boolean(enabled);

        // Update user in Keycloak
        await axios.put(
            `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${id}`,
            updateData,
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ User updated successfully');

        res.json({
            success: true,
            message: 'User updated successfully',
            updated: updateData
        });

    } catch (error) {
        console.error('❌ Update user error:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found'
            });
        }

        if (error.response?.status === 409) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'Email already in use'
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update user'
        });
    }
};
