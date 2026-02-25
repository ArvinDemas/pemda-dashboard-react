/**
 * LoginLog Model (Sequelize)
 * Tracks authentication events and user actions
 * Following auth-implementation-patterns: never log tokens/credentials
 */

const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const LoginLog = sequelize.define('LoginLog', {
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
    action: {
        type: DataTypes.ENUM(
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'LOGOUT',
            'PASSWORD_CHANGE',
            'EMAIL_CHANGE',
            'PROFILE_UPDATE',
            'SESSION_TERMINATED',
            'TOKEN_REFRESH'
        ),
        allowNull: false
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'user_agent'
    },
    sessionId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'session_id'
    },
    metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    success: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    errorMessage: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'error_message'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'login_logs',
    timestamps: false, // We use our own timestamp field
    indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'timestamp'] },
        { fields: ['session_id', 'timestamp'] },
        { fields: ['user_id', 'action', 'timestamp'] }
    ]
});

/**
 * Static method to log event (non-throwing)
 */
LoginLog.logEvent = async function (eventData) {
    try {
        const log = await this.create(eventData);
        return log;
    } catch (error) {
        console.error('Failed to log event:', error);
        return null;
    }
};

/**
 * Static method to get user login history with pagination
 */
LoginLog.getUserHistory = async function (userId, options = {}) {
    const {
        page = 1,
        limit = 20,
        fromDate,
        toDate,
        action
    } = options;

    const where = { userId };

    if (fromDate || toDate) {
        where.timestamp = {};
        if (fromDate) where.timestamp[Op.gte] = new Date(fromDate);
        if (toDate) {
            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);
            where.timestamp[Op.lte] = endOfDay;
        }
    }

    if (action) {
        where.action = action;
    }

    const offset = (page - 1) * limit;

    const { rows: logs, count: total } = await this.findAndCountAll({
        where,
        order: [['timestamp', 'DESC']],
        offset,
        limit,
        raw: true
    });

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

module.exports = LoginLog;
