/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Login endpoint (handle Keycloak token exchange)
router.post('/login', async (req, res) => {
    try {
        const { code, redirect_uri } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Authorization code required' });
        }

        // Exchange code for token
        const tokenResponse = await axios.post(
            `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirect_uri || `${process.env.FRONTEND_URL}/callback`,
                client_id: process.env.KEYCLOAK_CLIENT_ID,
                client_secret: process.env.KEYCLOAK_CLIENT_SECRET
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token, refresh_token, id_token } = tokenResponse.data;

        // Get user info
        const userInfoResponse = await axios.get(
            `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
            {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            }
        );

        const userInfo = userInfoResponse.data;

        // Parse User-Agent and IP for logging
        const UAParser = require('ua-parser-js');
        const geoip = require('geoip-lite');

        const parser = new UAParser(req.headers['user-agent']);
        const uaResult = parser.getResult();
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            '127.0.0.1';
        const geo = geoip.lookup(ipAddress);

        // Create LoginLog entry with correct schema
        const LoginLog = require('../models/LoginLog');
        // Using Sequelize model - LoginLog.create() works the same way
        // Non-blocking log creation
        LoginLog.create({
            userId: userInfo.sub,
            action: 'LOGIN_SUCCESS',  // Required field
            ip: ipAddress,            // Required field (not ipAddress)
            userAgent: req.headers['user-agent'] || 'Unknown',  // Required field
            sessionId: req.session?.id,
            success: true,
            metadata: {
                username: userInfo.preferred_username,
                browser: `${uaResult.browser.name || 'Unknown'} ${uaResult.browser.version || ''}`,
                os: `${uaResult.os.name || 'Unknown'} ${uaResult.os.version || ''}`,
                device: uaResult.device.type || 'Desktop',
                location: geo ? {
                    country: geo.country,
                    city: geo.city,
                    region: geo.region
                } : {}
            }
        }).catch(err => console.warn('⚠️ Login logging failed (non-critical):', err.message));

        console.log('✅ Login log created for:', userInfo.preferred_username);

        // Store in session
        req.session.user = {
            id: userInfo.sub,
            username: userInfo.preferred_username,
            email: userInfo.email,
            firstName: userInfo.given_name,
            lastName: userInfo.family_name,
            accessToken: access_token,
            refreshToken: refresh_token,
            idToken: id_token
        };

        res.json({
            success: true,
            user: {
                id: userInfo.sub,
                username: userInfo.preferred_username,
                email: userInfo.email,
                firstName: userInfo.given_name,
                lastName: userInfo.family_name
            },
            tokens: {
                accessToken: access_token,
                refreshToken: refresh_token,
                idToken: id_token
            }
        });

    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Authentication failed',
            details: error.response?.data || error.message
        });
    }
});

// Verify token
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify with Keycloak
        const userInfoResponse = await axios.get(
            `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        res.json({
            valid: true,
            user: userInfoResponse.data
        });

    } catch (error) {
        res.status(401).json({
            valid: false,
            error: 'Invalid token'
        });
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        const tokenResponse = await axios.post(
            `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
                client_id: process.env.KEYCLOAK_CLIENT_ID,
                client_secret: process.env.KEYCLOAK_CLIENT_SECRET
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        res.json(tokenResponse.data);

    } catch (error) {
        console.error('Refresh error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Token refresh failed',
            details: error.response?.data || error.message
        });
    }
});

// Logout - Silent operation that always succeeds
router.post('/logout', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        // Try to logout from Keycloak, but don't fail if it errors
        if (refresh_token) {
            try {
                await axios.post(
                    `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/logout`,
                    new URLSearchParams({
                        client_id: process.env.KEYCLOAK_CLIENT_ID,
                        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
                        refresh_token: refresh_token
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );
                console.log('✅ Logged out from Keycloak successfully');
            } catch (keycloakError) {
                // Log but don't fail - token might already be expired
                console.warn('⚠️ Keycloak logout warning:', keycloakError.response?.data || keycloakError.message);
            }
        }

        // Always destroy session
        if (req.session) {
            req.session.destroy();
        }

        // Always return success to frontend
        res.json({ success: true, message: 'Logged out successfully' });

    } catch (error) {
        // Even on error, return success to avoid frontend issues
        console.error('❌ Logout error:', error.message);
        res.json({ success: true, message: 'Logged out (with warnings)' });
    }
});

// Get current user
router.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({
            user: {
                id: req.session.user.id,
                username: req.session.user.username,
                email: req.session.user.email,
                firstName: req.session.user.firstName,
                lastName: req.session.user.lastName
            }
        });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

module.exports = router;
