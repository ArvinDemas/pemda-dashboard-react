/**
 * File Validation Middleware
 * Following file-uploads skill: magic byte verification, size limits, filename sanitization
 * CRITICAL SECURITY: Never trust client-provided file types
 */

const path = require('path');
const fs = require('fs').promises;

// Magic bytes for file type detection
const MAGIC_BYTES = {
    'application/pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
    'image/jpeg': Buffer.from([0xFF, 0xD8, 0xFF]),
    'image/png': Buffer.from([0x89, 0x50, 0x4E, 0x47]),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP (DOCX is ZIP)
    'application/msword': Buffer.from([0xD0, 0xCF, 0x11, 0xE0]) // DOC
};

// File size limits (in bytes)
const SIZE_LIMITS = {
    'application/pdf': 10 * 1024 * 1024, // 10MB
    'application/msword': 10 * 1024 * 1024, // 10MB
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 10 * 1024 * 1024, // 10MB
    'image/jpeg': 5 * 1024 * 1024, // 5MB
    'image/png': 5 * 1024 * 1024, // 5MB
    'image/jpg': 5 * 1024 * 1024 // 5MB
};

/**
 * Check file magic bytes to verify actual file type
 * CRITICAL: Don't trust file extensions!
 */
const checkMagicBytes = async (filePath) => {
    try {
        const buffer = await fs.readFile(filePath);

        // Check against known magic bytes
        for (const [mimeType, magicBytes] of Object.entries(MAGIC_BYTES)) {
            if (buffer.slice(0, magicBytes.length).equals(magicBytes)) {
                return mimeType;
            }
        }

        return null; // Unknown file type
    } catch (error) {
        console.error('Error reading file for magic byte check:', error);
        return null;
    }
};

/**
 * Validate file type by checking magic bytes
 */
const validateFileType = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'No file uploaded'
            });
        }

        const detectedType = await checkMagicBytes(req.file.path);

        if (!detectedType) {
            // Clean up uploaded file
            await fs.unlink(req.file.path).catch(() => { });

            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid file type. Allowed types: PDF, DOC, DOCX, JPG, PNG'
            });
        }

        // Verify detected type matches expected types
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png'
        ];

        if (!allowedTypes.includes(detectedType)) {
            await fs.unlink(req.file.path).catch(() => { });

            return res.status(400).json({
                error: 'Bad Request',
                message: 'File type not allowed'
            });
        }

        // Attach detected MIME type to request
        req.file.detectedMimeType = detectedType;

        next();
    } catch (error) {
        console.error('File type validation error:', error);

        // Clean up file on error
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(() => { });
        }

        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'File validation failed'
        });
    }
};

/**
 * Validate file size against limits
 */
const validateFileSize = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'No file uploaded'
        });
    }

    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    const sizeLimit = SIZE_LIMITS[mimeType] || 5 * 1024 * 1024; // Default 5MB

    if (fileSize > sizeLimit) {
        // Clean up uploaded file
        fs.unlink(req.file.path).catch(() => { });

        const limitMB = sizeLimit / (1024 * 1024);
        return res.status(400).json({
            error: 'Bad Request',
            message: `File size exceeds limit of ${limitMB}MB`
        });
    }

    next();
};

/**
 * Sanitize filename to prevent path traversal attacks
 * CRITICAL: Remove any path separators and dangerous characters
 */
const sanitizeFilename = (filename) => {
    if (!filename) return 'unnamed';

    // Remove path separators and dangerous characters
    let sanitized = filename
        .replace(/[\/\\]/g, '') // Remove / and \
        .replace(/\.\./g, '') // Remove ..
        .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove invalid chars
        .replace(/^\.+/, '') // Remove leading dots
        .trim();

    // Ensure filename isn't empty after sanitization
    if (!sanitized) {
        sanitized = 'unnamed';
    }

    // Limit length
    if (sanitized.length > 255) {
        const ext = path.extname(sanitized);
        const base = path.basename(sanitized, ext);
        sanitized = base.substring(0, 255 - ext.length) + ext;
    }

    return sanitized;
};

/**
 * Sanitize uploaded filename
 */
const sanitizeUploadedFilename = (req, res, next) => {
    if (req.file && req.file.originalname) {
        req.file.sanitizedOriginalName = sanitizeFilename(req.file.originalname);
    }
    next();
};

module.exports = {
    validateFileType,
    validateFileSize,
    sanitizeFilename,
    sanitizeUploadedFilename,
    checkMagicBytes
};
