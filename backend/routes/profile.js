/**
 * Profile Routes
 * User profile management endpoints
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

// All routes require authentication
router.use(requireAuth);

// GET /api/profile - Get user profile
router.get('/', profileController.getProfile);

// PUT /api/profile - Update profile (name, email)
router.put('/', profileController.updateProfile);

// PUT /api/profile/password - Change password
router.put('/password', profileController.changePassword);

module.exports = router;
