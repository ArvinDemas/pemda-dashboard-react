/**
 * Sessions Routes
 * Endpoints for managing Keycloak sessions
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const sessionsController = require('../controllers/sessionsController');

// All routes require authentication
router.use(requireAuth);

// GET /api/sessions - Get active sessions
router.get('/', sessionsController.getSessions);

// DELETE /api/sessions/:sessionId - Terminate specific session
router.delete('/:sessionId', sessionsController.terminateSession);

// POST /api/sessions/terminate-all - Terminate all sessions except current
router.post('/terminate-all', sessionsController.terminateAllSessions);

module.exports = router;
