/**
 * Notes Controller
 * CRUD operations for user notes
 */

const Note = require('../models/Note');

/**
 * Get all notes for authenticated user
 * GET /api/notes?page=1&limit=20&category=work
 */
exports.getNotes = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, category, search } = req.query;

        const query = { userId };

        // Filter by category if provided
        if (category && category !== 'all') {
            query.category = category;
        }

        // Search in title and content if provided
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [notes, total] = await Promise.all([
            Note.find(query)
                .sort({ isPinned: -1, updatedAt: -1 }) // Pinned notes first
                .skip(skip)
                .limit(parseInt(limit))
                .select('-__v')
                .lean(),
            Note.countDocuments(query)
        ]);

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

        const note = await Note.findOne({ _id: id, userId }).select('-__v');

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

        // Validation
        if (!title || !content) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Title and content are required'
            });
        }

        const note = new Note({
            userId,
            title: title.trim(),
            content: content.trim(),
            category: category || 'other',
            tags: tags || [],
            isPinned: isPinned || false
        });

        await note.save();

        res.status(201).json({
            message: 'Note created successfully',
            note
        });
    } catch (error) {
        console.error('Create note error:', error);

        if (error.name === 'ValidationError') {
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

        // Find note and verify ownership
        const note = await Note.findOne({ _id: id, userId });

        if (!note) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Note not found'
            });
        }

        // Update fields
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

        if (error.name === 'ValidationError') {
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

        const note = await Note.findOneAndDelete({ _id: id, userId });

        if (!note) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Note not found'
            });
        }

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

        const stats = await Note.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        const total = await Note.countDocuments({ userId });
        console.log('📊 [Notes Stats] Total notes found:', total, '| By category:', JSON.stringify(stats));

        // Return safe default values even when empty
        res.json({
            total: total || 0,
            byCategory: stats && stats.length > 0
                ? stats.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
                : {}  // Empty object when no notes
        });
    } catch (error) {
        console.error('❌ [Notes Stats] Error:', error);
        // Return safe defaults on error too
        res.status(500).json({
            total: 0,
            byCategory: {},
            error: 'Failed to fetch statistics'
        });
    }
};
