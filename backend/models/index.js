/**
 * Models Index
 * Initializes Sequelize and exports all models
 */

const { sequelize, connectDB } = require('../config/database');

// Import models
const Document = require('./Document');
const LoginLog = require('./LoginLog');
const Note = require('./Note');

module.exports = {
    sequelize,
    connectDB,
    Document,
    LoginLog,
    Note
};
