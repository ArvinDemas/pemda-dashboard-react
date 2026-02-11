/**
 * Logs Controller
 * Access to login and activity logs
 */

const LoginLog = require('../models/LoginLog');

/**
 * Get user's login history
 * GET /api/logs?page=1&limit=20&fromDate=2024-01-01&toDate=2024-12-31&action=LOGIN_SUCCESS
 */
exports.getLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit, fromDate, toDate, action } = req.query;

        const result = await LoginLog.getUserHistory(userId, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            fromDate,
            toDate,
            action
        });

        res.json(result);
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

        const stats = await LoginLog.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentCount = await LoginLog.countDocuments({
            userId,
            timestamp: { $gte: sevenDaysAgo }
        });

        const total = await LoginLog.countDocuments({ userId });

        // Return safe defaults even when empty
        res.json({
            total: total || 0,
            recentActivity: recentCount || 0,
            byAction: stats && stats.length > 0
                ? stats.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
                : {}  // Empty object when no logs
        });
    } catch (error) {
        console.error('Get logs stats error:', error);
        // Return safe defaults on error
        res.status(500).json({
            total: 0,
            recentActivity: 0,
            byAction: {},
            error: 'Failed to fetch statistics'
        });
    }
};
