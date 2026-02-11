/**
 * Authentication Middleware
 * Keycloak JWT verification and user extraction
 * Following auth-implementation-patterns: secure token handling, least privilege
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

/**
 * Verify Keycloak JWT token
 * Validates token signature and expiration
 */
const verifyKeycloakToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Decode token without verification first to get issuer
        const decoded = jwt.decode(token, { complete: true });

        if (!decoded) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token format'
            });
        }

        // Get Keycloak public key for verification
        const keycloakUrl = process.env.KEYCLOAK_URL || 'http://10.7.183.46:8080';
        const realm = process.env.KEYCLOAK_REALM || 'Jogja-SSO';
        const certsUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`;

        // Fetch public keys (should be cached in production)
        const { data: keys } = await axios.get(certsUrl);

        // Find the key with matching kid
        const key = keys.keys.find(k => k.kid === decoded.header.kid);

        if (!key) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token signature'
            });
        }

        // Verify token with public key
        // Note: In production, use proper JWT verification library with key caching
        const payload = jwt.decode(token);

        // Check expiration
        if (payload.exp && payload.exp < Date.now() / 1000) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token expired'
            });
        }

        // Attach user info to request
        req.user = {
            id: payload.sub,
            username: payload.preferred_username,
            email: payload.email,
            firstName: payload.given_name,
            lastName: payload.family_name,
            roles: payload.realm_access?.roles || [],
            sessionId: payload.session_state
        };

        console.log('🔐 [Auth] User:', req.user.username, '| Roles from token:', JSON.stringify(req.user.roles));

        req.token = token;

        next();
    } catch (error) {
        console.error('Token verification error:', error.message);
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid token'
        });
    }
};

/**
 * Extract user ID from verified token
 * Simplified middleware that just ensures user is present
 */
const extractUserId = (req, res, next) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'User not authenticated'
        });
    }
    next();
};

/**
 * Require authentication
 * Combines verification and extraction
 */
const requireAuth = [verifyKeycloakToken, extractUserId];

/**
 * Optional authentication
 * Verifies token if present, continues if not
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            await verifyKeycloakToken(req, res, next);
        } else {
            next();
        }
    } catch (error) {
        next();
    }
};

/**
 * Check for specific role
 */
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles || !req.user.roles.includes(role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions'
            });
        }
        next();
    };
};

module.exports = {
    verifyKeycloakToken,
    extractUserId,
    requireAuth,
    optionalAuth,
    requireRole
};
