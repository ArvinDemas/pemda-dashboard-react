/**
 * Users Routes
 * Admin endpoints for Keycloak user management
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const usersController = require('../controllers/usersController');

// All routes require authentication
router.use(requireAuth);

// All routes require admin role
router.use(requireAdmin);

// GET /api/users - Get all users
router.get('/', usersController.getUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', usersController.getUserById);

// PUT /api/users/:id - Update user
router.put('/:id', usersController.updateUser);

// GET /api/users/:id/roles - Get user roles
router.get('/:id/roles', usersController.getUserRoles);

module.exports = router;
