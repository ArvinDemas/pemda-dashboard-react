/**
 * PostgreSQL Database Configuration (Sequelize)
 * Handles connection, pooling, and error handling
 */

const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pemda_dashboard';

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        underscored: true // use snake_case column names
    }
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL Connected');
        console.log(`📊 Database: ${DATABASE_URL.split('/').pop().split('?')[0]}`);

        // Sync models (alter in dev, do nothing in prod)
        if (process.env.NODE_ENV !== 'production') {
            await sequelize.sync({ alter: true });
            console.log('✅ Database tables synced');
        }

        return sequelize;
    } catch (error) {
        console.error(`❌ PostgreSQL connection failed: ${error.message}`);
        throw error;
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    await sequelize.close();
    console.log('PostgreSQL connection closed through app termination');
    process.exit(0);
});

module.exports = { sequelize, connectDB };
