/**
 * PEMDA DIY Dashboard - Backend Server
 * Node.js + Express + Keycloak + PostgreSQL + MinIO
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { connectDB, sequelize } = require('./config/database');
const { initMinio } = require('./config/minio');
require('dotenv').config();

// Import models to ensure they are registered
require('./models/index');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Allow any origin on port 3000 (frontend dev server)
        // This prevents CORS issues when LAN IP changes
        if (origin.endsWith(':3000')) {
            return callback(null, true);
        }

        // Allow configured FRONTEND_URL
        const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
        if (origin === allowedOrigin) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'pemda-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Static files for uploads (legacy - new uploads go to MinIO)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/userManagement'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/logs', require('./routes/logs'));

console.log('✅ All API routes registered successfully');

// Health check
app.get('/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        await sequelize.authenticate();
        dbStatus = 'connected';
    } catch (e) {
        dbStatus = 'disconnected';
    }

    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║   PEMDA DIY Dashboard - Backend API   ║
    ╠════════════════════════════════════════╣
    ║   Server running on port ${PORT}        ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}          ║
    ║   Keycloak: ${process.env.KEYCLOAK_URL || 'Not configured'}   ║
    ╚════════════════════════════════════════╝
    `);

    // Connect to PostgreSQL (non-blocking)
    connectDB().catch(err => {
        console.warn('\n⚠️  PostgreSQL not connected - database features disabled');
        console.warn('   Auth endpoints will work via Keycloak proxy\n');
    });

    // Initialize MinIO (non-blocking)
    initMinio().catch(err => {
        console.warn('\n⚠️  MinIO not connected - file upload disabled');
        console.warn('   Error:', err.message, '\n');
    });
});

module.exports = app;
