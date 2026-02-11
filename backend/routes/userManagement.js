/**
 * User Management Routes (Admin Only)
 * Super Admin endpoints for comprehensive user administration
 */
console.log('✅ Admin Routes file loaded (userManagement.js)');

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const userManagementController = require('../controllers/userManagementController');

// All routes require authentication AND admin privileges
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/users - List all users with identity provider info
router.get('/users', userManagementController.listUsers);

// GET /api/admin/users/:id - Get single user details
router.get('/users/:id', userManagementController.getUserDetails);

// PUT /api/admin/users/:id - Update user (basic info)
router.put('/users/:id', userManagementController.updateUser);

// PUT /api/admin/users/:id/reset-password - Reset user password (no email, instant)
router.put('/users/:id/reset-password', userManagementController.resetUserPassword);

// DELETE /api/admin/users/:id - Hard delete user + all data
router.delete('/users/:id', userManagementController.deleteUser);

module.exports = router;
