/**
 * Document Model (Sequelize)
 * File uploads and folders with security validation
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const path = require('path');

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'user_id'
    },
    type: {
        type: DataTypes.ENUM('file', 'folder'),
        defaultValue: 'file',
        allowNull: false
    },
    parentFolderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        field: 'parent_folder_id',
        references: {
            model: 'documents',
            key: 'id'
        }
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: true
        // Sanitized UUID filename (for files only)
    },
    originalName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'original_name'
    },
    mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'mime_type',
        validate: {
            isIn: [[
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'image/jpeg',
                'image/png',
                'image/jpg'
            ]]
        }
    },
    size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        validate: {
            max: 10485760 // 10MB
        }
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'file_url'
        // MinIO object URL
    },
    uploadedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'uploaded_at'
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    description: {
        type: DataTypes.STRING(500),
        allowNull: true
    }
}, {
    tableName: 'documents',
    timestamps: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'uploaded_at'] },
        { fields: ['user_id', 'parent_folder_id', 'type'] }
    ]
});

// Self-referencing association for folder hierarchy
Document.hasMany(Document, { as: 'children', foreignKey: 'parent_folder_id' });
Document.belongsTo(Document, { as: 'parentFolder', foreignKey: 'parent_folder_id' });

// Helper: human-readable file size
Document.formatBytes = function (bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

module.exports = Document;
