/**
 * Notes Routes
 * Endpoints for note management
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const notesController = require('../controllers/notesController');

// All routes require authentication
router.use(requireAuth);

// GET /api/notes - Get all notes with pagination and filters
router.get('/', notesController.getNotes);

// GET /api/notes/stats - Get notes statistics
router.get('/stats', notesController.getNotesStats);

// GET /api/notes/:id - Get single note
router.get('/:id', notesController.getNoteById);

// POST /api/notes - Create new note
router.post('/', notesController.createNote);

// PUT /api/notes/:id - Update note
router.put('/:id', notesController.updateNote);

// DELETE /api/notes/:id - Delete note
router.delete('/:id', notesController.deleteNote);

module.exports = router;
