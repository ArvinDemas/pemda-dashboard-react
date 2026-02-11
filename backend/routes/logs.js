/**
 * Logs Routes
 * Endpoints for accessing login and activity logs
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const logsController = require('../controllers/logsController');

// All routes require authentication
router.use(requireAuth);

// GET /api/logs - Get user's login history with filters
router.get('/', logsController.getLogs);

// GET /api/logs/stats - Get logs statistics
router.get('/stats', logsController.getLogsStats);

module.exports = router;
