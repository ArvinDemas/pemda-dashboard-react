/**
 * Note Model
 * User notes with categories and timestamps
 */

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'User ID is required'],
        index: true
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: {
        type: String,
        required: false,
        maxlength: [50000, 'Content cannot exceed 50000 characters'] // Increased for HTML tags
    },
    category: {
        type: String,
        enum: ['Personal', 'Work', 'Important', 'Ideas', 'Other'],
        default: 'Other',
        index: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    isPinned: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for efficient querying
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, category: 1 });

// Update the updatedAt field before saving
noteSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for formatted date
noteSchema.virtual('formattedDate').get(function () {
    return this.createdAt.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

module.exports = mongoose.model('Note', noteSchema);
