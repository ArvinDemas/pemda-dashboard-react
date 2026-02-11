/**
 * PEMDA DIY Dashboard - Backend Server
 * Node.js + Express + Keycloak
 */

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const connectDB = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/userManagement')); // Admin routes mounted at /api/admin
app.use('/api/documents', require('./routes/documents'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/logs', require('./routes/logs'));

console.log('✅ All API routes registered successfully');

// Health check
app.get('/health', (req, res) => {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

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

// Start server immediately (MongoDB not required for auth)
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

    // Try MongoDB connection (non-blocking)
    connectDB().catch(err => {
        console.warn('\n⚠️  MongoDB not connected - database features disabled');
        console.warn('   Auth endpoints will work via Keycloak proxy\n');
    });
});

module.exports = app;
