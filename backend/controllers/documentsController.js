/**
 * Documents Controller
 * File upload, management, and download with security
 * Following file-uploads skill: magic byte verification, size limits, sanitization
 */

const Document = require('../models/Document');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * Upload document
 * POST /api/documents/upload
 */
exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'No file uploaded'
            });
        }

        const userId = req.user.id;
        const { description } = req.body;

        // File has already been validated by middleware
        // - Magic bytes checked
        // - Size validated
        // - Filename sanitized

        // Generate UUID filename to prevent conflicts and path traversal
        const fileExt = path.extname(req.file.sanitizedOriginalName || req.file.originalname);
        const uniqueFilename = `${crypto.randomUUID()}${fileExt}`;

        // Create user-specific directory
        const userUploadsDir = path.join(__dirname, '..', 'uploads', userId);
        await fs.mkdir(userUploadsDir, { recursive: true });

        // Move file from temp to final location
        const finalPath = path.join(userUploadsDir, uniqueFilename);
        await fs.rename(req.file.path, finalPath);

        // Create document record
        const document = new Document({
            userId,
            filename: uniqueFilename,
            originalName: req.file.sanitizedOriginalName || req.file.originalname,
            mimeType: req.file.detectedMimeType || req.file.mimetype,
            size: req.file.size,
            path: finalPath,
            url: `/uploads/${userId}/${uniqueFilename}`,
            verified: true, // Magic bytes were checked
            description: description || ''
        });

        await document.save();

        res.status(201).json({
            message: 'File uploaded successfully',
            document: {
                id: document._id,
                originalName: document.originalName,
                size: document.readableSize,
                mimeType: document.mimeType,
                uploadedAt: document.uploadedAt,
                url: document.url
            }
        });
    } catch (error) {
        console.error('Upload document error:', error);

        // Clean up file on error
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(() => { });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to upload file'
        });
    }
};

/**
 * Get all documents for user
 * GET /api/documents?page=1&limit=20
 */
exports.getDocuments = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, search } = req.query;

        const query = { userId };

        // Search in filename and description
        if (search) {
            query.$or = [
                { originalName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [documents, total] = await Promise.all([
            Document.find(query)
                .sort({ uploadedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('-path -__v') // Don't expose file system path
                .lean(),
            Document.countDocuments(query)
        ]);

        // Add readable size to response
        const documentsWithSize = documents.map(doc => ({
            ...doc,
            readableSize: formatBytes(doc.size)
        }));

        res.json({
            documents: documentsWithSize,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch documents'
        });
    }
};

/**
 * Download document
 * GET /api/documents/:id/download
 */
exports.downloadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const document = await Document.findOne({ _id: id, userId });

        if (!document) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Document not found'
            });
        }

        // Check if file exists
        try {
            await fs.access(document.path);
        } catch (err) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'File not found on server'
            });
        }

        // Set headers for download
        res.setHeader('Content-Type', document.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalName)}"`);
        res.setHeader('Content-Length', document.size);

        // Stream file to response
        const fileStream = require('fs').createReadStream(document.path);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('File stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Failed to download file'
                });
            }
        });
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to download document'
        });
    }
};

/**
 * Delete document
 * DELETE /api/documents/:id
 */
exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const document = await Document.findOne({ _id: id, userId });

        if (!document) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Document not found'
            });
        }

        // Delete file from filesystem
        try {
            await fs.unlink(document.path);
        } catch (err) {
            console.warn('Failed to delete file:', err.message);
            // Continue anyway to remove database record
        }

        // Delete database record
        await Document.deleteOne({ _id: id });

        res.json({
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete document'
        });
    }
};

/**
 * Get documents stats (updated to exclude folders from stats)
 * GET /api/documents/stats
 */
exports.getDocumentsStats = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('📊 [Docs Stats] Fetching for userId:', userId);

        const stats = await Document.aggregate([
            { $match: { userId, type: 'file' } }, // Only count files, not folders
            {
                $group: {
                    _id: '$mimeType',
                    count: { $sum: 1 },
                    totalSize: { $sum: '$size' }
                }
            }
        ]);

        const total = await Document.countDocuments({ userId, type: 'file' });
        const totalSize = stats && stats.length > 0
            ? stats.reduce((sum, item) => sum + item.totalSize, 0)
            : 0;

        console.log('📊 [Docs Stats] Total docs found:', total, '| Total size:', totalSize);

        // Return safe defaults even when empty
        res.json({
            total: total || 0,
            totalSize: formatBytes(totalSize),
            totalDocuments: total || 0, // Add this for dashboard compatibility
            byType: stats && stats.length > 0
                ? stats.map(item => ({
                    type: item._id,
                    count: item.count,
                    size: formatBytes(item.totalSize)
                }))
                : []  // Empty array when no documents
        });
    } catch (error) {
        console.error('❌ [Docs Stats] Error:', error);
        // Return safe defaults on error
        res.status(500).json({
            total: 0,
            totalSize: '0 Bytes',
            totalDocuments: 0,
            byType: [],
            error: 'Failed to fetch statistics'
        });
    }
};

/**
 * Create folder
 * POST /api/documents/folder
 */
exports.createFolder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, parentFolderId } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Folder name is required'
            });
        }

        // Check if folder with same name exists in same parent
        const existingFolder = await Document.findOne({
            userId,
            originalName: name.trim(),
            parentFolderId: parentFolderId || null,
            type: 'folder'
        });

        if (existingFolder) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'A folder with this name already exists here'
            });
        }

        // If parentFolderId is provided, verify it exists and is a folder
        if (parentFolderId) {
            const parentFolder = await Document.findOne({
                _id: parentFolderId,
                userId,
                type: 'folder'
            });

            if (!parentFolder) {
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'Parent folder not found'
                });
            }
        }

        const folder = new Document({
            userId,
            type: 'folder',
            originalName: name.trim(),
            parentFolderId: parentFolderId || null,
            verified: true
        });

        await folder.save();

        res.status(201).json({
            message: 'Folder created successfully',
            folder: {
                id: folder._id,
                name: folder.originalName,
                type: folder.type,
                parentFolderId: folder.parentFolderId,
                createdAt: folder.createdAt
            }
        });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create folder'
        });
    }
};

/**
 * Get folder contents
 * GET /api/documents/folder/:folderId? (null/undefined for root)
 */
exports.getFolderContents = async (req, res) => {
    try {
        const userId = req.user.id;
        const { folderId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Determine parent folder ID (null for root)
        const parentFolderId = folderId && folderId !== 'root' ? folderId : null;

        // If not root, verify folder exists
        if (parentFolderId) {
            const folder = await Document.findOne({
                _id: parentFolderId,
                userId,
                type: 'folder'
            });

            if (!folder) {
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'Folder not found'
                });
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get all items in this folder
        const [items, total] = await Promise.all([
            Document.find({
                userId,
                parentFolderId
            })
                .sort({ type: -1, originalName: 1 }) // Folders first, then files, alphabetically
                .skip(skip)
                .limit(parseInt(limit))
                .select('-path -__v')
                .lean(),
            Document.countDocuments({ userId, parentFolderId })
        ]);

        // Build breadcrumb trail
        const breadcrumbs = await buildBreadcrumbs(userId, parentFolderId);

        // Format items
        const formattedItems = items.map(item => ({
            ...item,
            readableSize: item.type === 'file' ? formatBytes(item.size) : null,
            isFolder: item.type === 'folder'
        }));

        res.json({
            items: formattedItems,
            breadcrumbs,
            currentFolder: {
                id: parentFolderId,
                name: parentFolderId ? (await Document.findById(parentFolderId))?.originalName : 'Root'
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get folder contents error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch folder contents'
        });
    }
};

/**
 * Rename file or folder
 * PUT /api/documents/:id/rename
 */
exports.renameItem = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { newName } = req.body;

        if (!newName || !newName.trim()) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'New name is required'
            });
        }

        const item = await Document.findOne({ _id: id, userId });

        if (!item) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Item not found'
            });
        }

        // Check for name conflicts in the same folder
        const conflict = await Document.findOne({
            userId,
            originalName: newName.trim(),
            parentFolderId: item.parentFolderId,
            type: item.type,
            _id: { $ne: id }
        });

        if (conflict) {
            return res.status(409).json({
                error: 'Conflict',
                message: `A ${item.type} with this name already exists here`
            });
        }

        item.originalName = newName.trim();
        await item.save();

        res.json({
            message: `${item.type === 'folder' ? 'Folder' : 'File'} renamed successfully`,
            item: {
                id: item._id,
                name: item.originalName,
                type: item.type
            }
        });
    } catch (error) {
        console.error('Rename item error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to rename item'
        });
    }
};

// Helper function to build breadcrumb trail
async function buildBreadcrumbs(userId, folderId) {
    const breadcrumbs = [{ id: null, name: 'Root' }];

    if (!folderId) return breadcrumbs;

    let currentId = folderId;
    const chain = [];

    // Walk up the folder tree
    while (currentId) {
        const folder = await Document.findOne({
            _id: currentId,
            userId,
            type: 'folder'
        });

        if (!folder) break;

        chain.unshift({ id: folder._id.toString(), name: folder.originalName });
        currentId = folder.parentFolderId;
    }

    return [...breadcrumbs, ...chain];
}

// Helper function to format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
