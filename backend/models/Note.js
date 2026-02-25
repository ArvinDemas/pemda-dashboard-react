/**
 * Note Model (Sequelize)
 * User notes with categories and timestamps
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Note = sequelize.define('Note', {
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
    title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    category: {
        type: DataTypes.ENUM('Personal', 'Work', 'Important', 'Ideas', 'Other'),
        defaultValue: 'Other'
    },
    tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    isPinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_pinned'
    }
}, {
    tableName: 'notes',
    timestamps: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'created_at'] },
        { fields: ['user_id', 'category'] }
    ]
});

module.exports = Note;
