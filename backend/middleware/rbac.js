/**
 * RBAC Middleware
 * Role-based access control for admin routes
 * FIXED: Uses req.user.roles (set by auth.js) instead of req.user.realm_access?.roles
 */

/**
 * Check if user has admin role
 */
exports.requireAdmin = async (req, res, next) => {
    try {
        // User should already be authenticated via requireAuth middleware
        if (!req.user) {
            console.log('❌ RBAC: No user on request');
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        console.log('🔐 RBAC Check for:', req.user.username, '| Email:', req.user.email);
        console.log('🔐 RBAC req.user.roles:', JSON.stringify(req.user.roles));

        // FIXED: auth.js sets roles at req.user.roles, NOT req.user.realm_access.roles
        const userRoles = req.user.roles || [];

        // Check multiple admin role variations (case-insensitive)
        const adminRoleVariations = ['admin', 'realm-admin', 'manage-users', 'super_admin'];
        const isRoleAdmin = userRoles.some(role =>
            adminRoleVariations.some(adminRole => role.toLowerCase() === adminRole.toLowerCase())
        );

        // Hardcoded admin email bypass
        const isEmailAdmin = req.user.email === 'admin@gmail.com';

        const isAdmin = isRoleAdmin || isEmailAdmin;

        console.log('🔐 RBAC Result: isRoleAdmin=', isRoleAdmin, '| isEmailAdmin=', isEmailAdmin, '| FINAL=', isAdmin);

        if (!isAdmin) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Admin access required'
            });
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to verify admin access'
        });
    }
};
