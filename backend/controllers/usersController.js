/**
 * Users Controller
 * Keycloak user management via Admin API
 */

// Store admin client instance for reuse
let kcAdminClientInstance = null;

// Initialize Keycloak Admin Client with dynamic import
const getAdminClient = async () => {
    if (!kcAdminClientInstance) {
        // Dynamic import for ESM module
        const { default: KcAdminClient } = await import('@keycloak/keycloak-admin-client');

        kcAdminClientInstance = new KcAdminClient({
            baseUrl: process.env.KEYCLOAK_URL,
            realmName: process.env.KEYCLOAK_REALM,
        });
    }

    // Authenticate with admin credentials
    await kcAdminClientInstance.auth({
        grantType: 'client_credentials',
        clientId: process.env.KEYCLOAK_ADMIN_CLIENT || 'admin-cli',
        clientSecret: process.env.KEYCLOAK_ADMIN_SECRET,
    });

    return kcAdminClientInstance;
};

/**
 * Get all users from Keycloak
 * GET /api/users
 */
exports.getUsers = async (req, res) => {
    try {
        const { search, max = 100 } = req.query;

        const kcAdminClient = await getAdminClient();

        // Fetch users with optional search
        const users = await kcAdminClient.users.find({
            max: parseInt(max),
            search: search || undefined,
        });

        // Format user data for frontend
        const formattedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            enabled: user.enabled,
            emailVerified: user.emailVerified,
            createdTimestamp: user.createdTimestamp,
        }));

        res.json({
            users: formattedUsers,
            total: formattedUsers.length
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch users from Keycloak'
        });
    }
};

/**
 * Get single user by ID
 * GET /api/users/:id
 */
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const kcAdminClient = await getAdminClient();
        const user = await kcAdminClient.users.findOne({ id });

        if (!user) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found'
            });
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            enabled: user.enabled,
            emailVerified: user.emailVerified,
            createdTimestamp: user.createdTimestamp,
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch user'
        });
    }
};

/**
 * Update user details
 * PUT /api/users/:id
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, enabled, emailVerified } = req.body;

        const kcAdminClient = await getAdminClient();

        // Check if user exists
        const existingUser = await kcAdminClient.users.findOne({ id });
        if (!existingUser) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found'
            });
        }

        // Update user
        await kcAdminClient.users.update(
            { id },
            {
                firstName: firstName !== undefined ? firstName : existingUser.firstName,
                lastName: lastName !== undefined ? lastName : existingUser.lastName,
                email: email !== undefined ? email : existingUser.email,
                enabled: enabled !== undefined ? enabled : existingUser.enabled,
                emailVerified: emailVerified !== undefined ? emailVerified : existingUser.emailVerified,
            }
        );

        // Fetch updated user
        const updatedUser = await kcAdminClient.users.findOne({ id });

        res.json({
            message: 'User updated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                enabled: updatedUser.enabled,
                emailVerified: updatedUser.emailVerified,
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message || 'Failed to update user'
        });
    }
};

/**
 * Get user roles
 * GET /api/users/:id/roles
 */
exports.getUserRoles = async (req, res) => {
    try {
        const { id } = req.params;

        const kcAdminClient = await getAdminClient();

        // Get realm roles for user
        const roles = await kcAdminClient.users.listRealmRoleMappings({ id });

        res.json({
            roles: roles.map(role => ({
                id: role.id,
                name: role.name,
                description: role.description
            }))
        });
    } catch (error) {
        console.error('Get user roles error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch user roles'
        });
    }
};
