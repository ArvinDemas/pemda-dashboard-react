/**
 * Documents Routes
 * File upload and management endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const {
    validateFileType,
    validateFileSize,
    sanitizeUploadedFilename
} = require('../middleware/fileValidation');
const documentsController = require('../controllers/documentsController');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Temporary location, will be moved by controller
        cb(null, 'uploads/temp');
    },
    filename: function (req, file, cb) {
        // Temporary filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Create temp directory if it doesn't exist
const fs = require('fs');
const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// All routes require authentication
router.use(requireAuth);

// POST /api/documents/upload - Upload document with security checks
router.post('/upload',
    upload.single('file'),
    sanitizeUploadedFilename,
    validateFileSize,
    validateFileType,
    documentsController.uploadDocument
);

// GET /api/documents - Get all documents with pagination
router.get('/', documentsController.getDocuments);

// GET /api/documents/stats - Get documents statistics
router.get('/stats', documentsController.getDocumentsStats);

// POST /api/documents/folder - Create folder
router.post('/folder', documentsController.createFolder);

// GET /api/documents/folder/:folderId - Get folder contents
router.get('/folder/:folderId', documentsController.getFolderContents);

// PUT /api/documents/:id/rename - Rename file or folder
router.put('/:id/rename', documentsController.renameItem);

// GET /api/documents/:id/download - Download document
router.get('/:id/download', documentsController.downloadDocument);

// DELETE /api/documents/:id - Delete document
router.delete('/:id', documentsController.deleteDocument);

module.exports = router;

