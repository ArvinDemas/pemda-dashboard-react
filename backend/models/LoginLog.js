/**
 * LoginLog Model
 * Tracks authentication events and user actions
 * Following auth-implementation-patterns: never log tokens/credentials
 */

const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'User ID is required'],
        index: true
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        enum: [
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'LOGOUT',
            'PASSWORD_CHANGE',
            'EMAIL_CHANGE',
            'PROFILE_UPDATE',
            'SESSION_TERMINATED',
            'TOKEN_REFRESH'
        ],
        index: true
    },
    ip: {
        type: String,
        required: [true, 'IP address is required']
    },
    userAgent: {
        type: String,
        required: [true, 'User agent is required']
    },
    sessionId: {
        type: String,
        index: true
    },
    metadata: {
        // Additional context-specific data
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    success: {
        type: Boolean,
        default: true
    },
    errorMessage: {
        type: String,
        // Only store user-safe error messages, never sensitive data
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false // We use our own timestamp field
});

// Compound indexes for efficient querying
loginLogSchema.index({ userId: 1, timestamp: -1 });
loginLogSchema.index({ sessionId: 1, timestamp: -1 });
loginLogSchema.index({ userId: 1, action: 1, timestamp: -1 });

// Virtual for formatted timestamp
loginLogSchema.virtual('formattedTimestamp').get(function () {
    return this.timestamp.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
});

// Static method to log event
loginLogSchema.statics.logEvent = async function (eventData) {
    try {
        const log = new this(eventData);
        await log.save();
        return log;
    } catch (error) {
        console.error('Failed to log event:', error);
        // Don't throw - logging failures shouldn't break the app
        return null;
    }
};

// Static method to get user login history with pagination
loginLogSchema.statics.getUserHistory = async function (userId, options = {}) {
    const {
        page = 1,
        limit = 20,
        fromDate,
        toDate,
        action
    } = options;

    const query = { userId };

    if (fromDate || toDate) {
        query.timestamp = {};
        if (fromDate) query.timestamp.$gte = new Date(fromDate);
        if (toDate) query.timestamp.$lte = new Date(toDate);
    }

    if (action) {
        query.action = action;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
        this.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

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

module.exports = mongoose.model('LoginLog', loginLogSchema);
