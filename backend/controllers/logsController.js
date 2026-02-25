/**
 * Logs Controller
 * Access to login and activity logs (Sequelize)
 */

const LoginLog = require('../models/LoginLog');
const { fn, col, Op } = require('sequelize');

/**
 * Get user's login history
 * GET /api/logs?page=1&limit=20&startDate=2024-01-01&endDate=2024-12-31&success=true
 * Also supports legacy: fromDate, toDate, action
 */
exports.getLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit, startDate, endDate, success, fromDate, toDate, action } = req.query;

        // Map frontend param names to backend: startDate->fromDate, endDate->toDate
        const resolvedFromDate = startDate || fromDate;
        const resolvedToDate = endDate || toDate;

        // Map success boolean to action filter
        let resolvedAction = action;
        if (!resolvedAction && success !== undefined) {
            resolvedAction = success === 'true' ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED';
        }

        const result = await LoginLog.getUserHistory(userId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            fromDate: resolvedFromDate,
            toDate: resolvedToDate,
            action: resolvedAction
        });

        // Return in format the frontend expects: { logs, totalPages }
        res.json({
            logs: result.logs || [],
            totalPages: result.pagination?.pages || 1,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch logs'
        });
    }
};

/**
 * Get logs statistics
 * GET /api/logs/stats
 */
exports.getLogsStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await LoginLog.findAll({
            where: { userId },
            attributes: [
                'action',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['action'],
            raw: true
        });

        // Build byAction map
        const byAction = stats && stats.length > 0
            ? stats.reduce((acc, item) => {
                acc[item.action] = parseInt(item.count);
                return acc;
            }, {})
            : {};

        const totalLogins = (byAction['LOGIN_SUCCESS'] || 0) + (byAction['LOGIN_FAILED'] || 0);
        const successfulLogins = byAction['LOGIN_SUCCESS'] || 0;
        const failedLogins = byAction['LOGIN_FAILED'] || 0;

        // Get last login timestamp
        const lastLoginRecord = await LoginLog.findOne({
            where: { userId, action: 'LOGIN_SUCCESS' },
            order: [['timestamp', 'DESC']],
            attributes: ['timestamp'],
            raw: true
        });

        res.json({
            totalLogins,
            successfulLogins,
            failedLogins,
            lastLogin: lastLoginRecord?.timestamp || null,
            byAction
        });
    } catch (error) {
        console.error('Get logs stats error:', error);
        res.status(500).json({
            totalLogins: 0,
            successfulLogins: 0,
            failedLogins: 0,
            lastLogin: null,
            byAction: {},
            error: 'Failed to fetch statistics'
        });
    }
};
