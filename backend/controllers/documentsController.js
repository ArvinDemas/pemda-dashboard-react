/**
 * Documents Controller
 * File upload to MinIO, management, and download with security
 */

const Document = require('../models/Document');
const { minioClient, BUCKET_NAME } = require('../config/minio');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Upload document → MinIO → save URL in Postgres
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
        const { description, parentFolderId } = req.body;

        // Generate UUID filename
        const fileExt = path.extname(req.file.sanitizedOriginalName || req.file.originalname);
        const uniqueFilename = `${crypto.randomUUID()}${fileExt}`;
        const objectName = `${userId}/${uniqueFilename}`;

        // Upload to MinIO
        await minioClient.fPutObject(BUCKET_NAME, objectName, req.file.path, {
            'Content-Type': req.file.detectedMimeType || req.file.mimetype,
            'X-Original-Name': encodeURIComponent(req.file.sanitizedOriginalName || req.file.originalname)
        });

        // Build the file URL
        const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
        const minioPort = process.env.MINIO_PORT || '9000';
        const fileUrl = `http://${minioEndpoint}:${minioPort}/${BUCKET_NAME}/${objectName}`;

        // Create document record in Postgres
        const document = await Document.create({
            userId,
            type: 'file',
            filename: uniqueFilename,
            originalName: req.file.sanitizedOriginalName || req.file.originalname,
            mimeType: req.file.detectedMimeType || req.file.mimetype,
            size: req.file.size,
            fileUrl,
            verified: true,
            description: description || '',
            parentFolderId: parentFolderId || null
        });

        // Clean up temp file
        await fs.unlink(req.file.path).catch(() => { });

        res.status(201).json({
            message: 'File uploaded successfully',
            document: {
                id: document.id,
                originalName: document.originalName,
                size: Document.formatBytes(document.size),
                mimeType: document.mimeType,
                uploadedAt: document.uploadedAt,
                url: document.fileUrl
            }
        });
    } catch (error) {
        console.error('Upload document error:', error);

        // Clean up temp file on error
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

        const where = { userId };

        if (search) {
            where[Op.or] = [
                { originalName: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { rows: documents, count: total } = await Document.findAndCountAll({
            where,
            order: [['uploadedAt', 'DESC']],
            offset,
            limit: parseInt(limit),
            raw: true
        });

        const documentsWithSize = documents.map(doc => ({
            ...doc,
            readableSize: Document.formatBytes(doc.size)
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
 * Download document (proxy from MinIO)
 * GET /api/documents/:id/download
 */
exports.downloadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const document = await Document.findOne({ where: { id, userId } });

        if (!document) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Document not found'
            });
        }

        const objectName = `${userId}/${document.filename}`;

        // Set download headers
        res.setHeader('Content-Type', document.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalName)}"`);
        if (document.size) res.setHeader('Content-Length', document.size);

        // Stream from MinIO
        const stream = await minioClient.getObject(BUCKET_NAME, objectName);
        stream.pipe(res);

        stream.on('error', (error) => {
            console.error('MinIO stream error:', error);
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

        const document = await Document.findOne({ where: { id, userId } });

        if (!document) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Document not found'
            });
        }

        // Delete from MinIO if it's a file
        if (document.type === 'file' && document.filename) {
            const objectName = `${userId}/${document.filename}`;
            await minioClient.removeObject(BUCKET_NAME, objectName).catch(err => {
                console.warn('Failed to delete file from MinIO:', err.message);
            });
        }

        // Delete database record
        await document.destroy();

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
 * Get documents stats (exclude folders)
 * GET /api/documents/stats
 */
exports.getDocumentsStats = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('📊 [Docs Stats] Fetching for userId:', userId);

        const stats = await Document.findAll({
            where: { userId, type: 'file' },
            attributes: [
                'mimeType',
                [fn('COUNT', col('id')), 'count'],
                [fn('SUM', col('size')), 'totalSize']
            ],
            group: ['mimeType'],
            raw: true
        });

        const total = await Document.count({ where: { userId, type: 'file' } });
        const totalSize = stats && stats.length > 0
            ? stats.reduce((sum, item) => sum + parseInt(item.totalSize || 0), 0)
            : 0;

        console.log('📊 [Docs Stats] Total docs found:', total, '| Total size:', totalSize);

        res.json({
            total: total || 0,
            totalSize: Document.formatBytes(totalSize),
            totalDocuments: total || 0,
            byType: stats && stats.length > 0
                ? stats.map(item => ({
                    type: item.mimeType,
                    count: parseInt(item.count),
                    size: Document.formatBytes(parseInt(item.totalSize || 0))
                }))
                : []
        });
    } catch (error) {
        console.error('❌ [Docs Stats] Error:', error);
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
            where: {
                userId,
                originalName: name.trim(),
                parentFolderId: parentFolderId || null,
                type: 'folder'
            }
        });

        if (existingFolder) {
            return res.status(409).json({
                error: 'Conflict',
                message: 'A folder with this name already exists here'
            });
        }

        // If parentFolderId provided, verify it exists
        if (parentFolderId) {
            const parentFolder = await Document.findOne({
                where: { id: parentFolderId, userId, type: 'folder' }
            });
            if (!parentFolder) {
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'Parent folder not found'
                });
            }
        }

        const folder = await Document.create({
            userId,
            type: 'folder',
            originalName: name.trim(),
            parentFolderId: parentFolderId || null,
            verified: true
        });

        res.status(201).json({
            message: 'Folder created successfully',
            folder: {
                id: folder.id,
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
 * GET /api/documents/folder/:folderId
 */
exports.getFolderContents = async (req, res) => {
    try {
        const userId = req.user.id;
        const { folderId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const parentFolderId = folderId && folderId !== 'root' ? parseInt(folderId) : null;

        // Verify folder exists if not root
        if (parentFolderId) {
            const folder = await Document.findOne({
                where: { id: parentFolderId, userId, type: 'folder' }
            });
            if (!folder) {
                return res.status(404).json({
                    error: 'Not Found',
                    message: 'Folder not found'
                });
            }
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { rows: items, count: total } = await Document.findAndCountAll({
            where: { userId, parentFolderId },
            order: [['type', 'DESC'], ['originalName', 'ASC']],
            offset,
            limit: parseInt(limit),
            raw: true
        });

        const breadcrumbs = await buildBreadcrumbs(userId, parentFolderId);

        const formattedItems = items.map(item => ({
            ...item,
            readableSize: item.type === 'file' ? Document.formatBytes(item.size) : null,
            isFolder: item.type === 'folder'
        }));

        let currentFolderName = 'Root';
        if (parentFolderId) {
            const cf = await Document.findByPk(parentFolderId);
            currentFolderName = cf ? cf.originalName : 'Root';
        }

        res.json({
            items: formattedItems,
            breadcrumbs,
            currentFolder: {
                id: parentFolderId,
                name: currentFolderName
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

        const item = await Document.findOne({ where: { id, userId } });

        if (!item) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Item not found'
            });
        }

        // Check for name conflicts
        const conflict = await Document.findOne({
            where: {
                userId,
                originalName: newName.trim(),
                parentFolderId: item.parentFolderId,
                type: item.type,
                id: { [Op.ne]: id }
            }
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
                id: item.id,
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

// Helper: build breadcrumb trail
async function buildBreadcrumbs(userId, folderId) {
    const breadcrumbs = [{ id: null, name: 'Root' }];
    if (!folderId) return breadcrumbs;

    let currentId = folderId;
    const chain = [];

    while (currentId) {
        const folder = await Document.findOne({
            where: { id: currentId, userId, type: 'folder' }
        });
        if (!folder) break;
        chain.unshift({ id: folder.id, name: folder.originalName });
        currentId = folder.parentFolderId;
    }

    return [...breadcrumbs, ...chain];
}
