/**
 * Document Model
 * File uploads with security validation
 * Following file-uploads skill: magic byte verification, size limits, filename sanitization
 */

const mongoose = require('mongoose');
const path = require('path');

const documentSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'User ID is required'],
        index: true
    },
    type: {
        type: String,
        enum: ['file', 'folder'],
        default: 'file',
        required: true
    },
    parentFolderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        default: null,
        index: true
    },
    filename: {
        type: String,
        required: function () { return this.type === 'file'; },
        // This is the sanitized UUID filename stored on disk (for files only)
    },
    originalName: {
        type: String,
        required: [true, 'Original filename/folder name is required'],
        trim: true
    },
    mimeType: {
        type: String,
        required: function () { return this.type === 'file'; },
        enum: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/jpg'
        ]
    },
    size: {
        type: Number,
        required: function () { return this.type === 'file'; },
        max: [10485760, 'File size cannot exceed 10MB'] // 10MB in bytes
    },
    path: {
        type: String,
        required: function () { return this.type === 'file'; }
    },
    url: {
        type: String,
        // Will be constructed as /uploads/{userId}/{filename}
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    // Security: verified via magic bytes, not just extension
    verified: {
        type: Boolean,
        default: function () { return this.type === 'folder' ? true : false; }
    },
    // Optional description
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

// Compound indexes for efficient querying
documentSchema.index({ userId: 1, uploadedAt: -1 });
documentSchema.index({ userId: 1, parentFolderId: 1, type: 1 });

// Virtual for file extension
documentSchema.virtual('extension').get(function () {
    return path.extname(this.originalName).toLowerCase();
});

// Virtual for human-readable file size
documentSchema.virtual('readableSize').get(function () {
    const bytes = this.size;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
});

// Set virtuals to be included in JSON output
documentSchema.set('toJSON', { virtuals: true });
documentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Document', documentSchema);
