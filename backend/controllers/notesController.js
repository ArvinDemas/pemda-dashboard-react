/**
 * Notes Controller
 * CRUD operations for user notes (Sequelize)
 */

const Note = require('../models/Note');
const { Op, fn, col } = require('sequelize');

/**
 * Get all notes for authenticated user
 * GET /api/notes?page=1&limit=20&category=work
 */
exports.getNotes = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, category, search } = req.query;

        const where = { userId };

        if (category && category !== 'all') {
            where.category = category;
        }

        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { content: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { rows: notes, count: total } = await Note.findAndCountAll({
            where,
            order: [['isPinned', 'DESC'], ['updatedAt', 'DESC']],
            offset,
            limit: parseInt(limit),
            raw: true
        });

        res.json({
            notes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch notes'
        });
    }
};

/**
 * Get single note by ID
 * GET /api/notes/:id
 */
exports.getNoteById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const note = await Note.findOne({ where: { id, userId } });

        if (!note) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Note not found'
            });
        }

        res.json(note);
    } catch (error) {
        console.error('Get note error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch note'
        });
    }
};

/**
 * Create new note
 * POST /api/notes
 */
exports.createNote = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, content, category, tags, isPinned } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Title and content are required'
            });
        }

        const note = await Note.create({
            userId,
            title: title.trim(),
            content: content.trim(),
            category: category || 'Other',
            tags: tags || [],
            isPinned: isPinned || false
        });

        res.status(201).json({
            message: 'Note created successfully',
            note
        });
    } catch (error) {
        console.error('Create note error:', error);

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create note'
        });
    }
};

/**
 * Update note
 * PUT /api/notes/:id
 */
exports.updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, content, category, tags, isPinned } = req.body;

        const note = await Note.findOne({ where: { id, userId } });

        if (!note) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Note not found'
            });
        }

        if (title !== undefined) note.title = title.trim();
        if (content !== undefined) note.content = content.trim();
        if (category !== undefined) note.category = category;
        if (tags !== undefined) note.tags = tags;
        if (isPinned !== undefined) note.isPinned = isPinned;

        await note.save();

        res.json({
            message: 'Note updated successfully',
            note
        });
    } catch (error) {
        console.error('Update note error:', error);

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.message
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update note'
        });
    }
};

/**
 * Delete note
 * DELETE /api/notes/:id
 */
exports.deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const note = await Note.findOne({ where: { id, userId } });

        if (!note) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Note not found'
            });
        }

        await note.destroy();

        res.json({
            message: 'Note deleted successfully'
        });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete note'
        });
    }
};

/**
 * Get notes statistics
 * GET /api/notes/stats
 */
exports.getNotesStats = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('📊 [Notes Stats] Fetching for userId:', userId);

        const stats = await Note.findAll({
            where: { userId },
            attributes: [
                'category',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['category'],
            raw: true
        });

        const total = await Note.count({ where: { userId } });
        console.log('📊 [Notes Stats] Total notes found:', total, '| By category:', JSON.stringify(stats));

        res.json({
            total: total || 0,
            byCategory: stats && stats.length > 0
                ? stats.reduce((acc, item) => {
                    acc[item.category] = parseInt(item.count);
                    return acc;
                }, {})
                : {}
        });
    } catch (error) {
        console.error('❌ [Notes Stats] Error:', error);
        res.status(500).json({
            total: 0,
            byCategory: {},
            error: 'Failed to fetch statistics'
        });
    }
};
