const { Pool } = require('pg');
if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    require('dotenv').config();
}

const isProduction = process.env.NODE_ENV === 'production' || process.env.CF_PAGES;

const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // SSL is required for Neon and other cloud providers
    ssl: isProduction ? { rejectUnauthorized: false } : false
};

// Fallback to individual vars if connectionString is missing (for local dev)
if (!poolConfig.connectionString) {
    poolConfig.user = process.env.DB_USER;
    poolConfig.host = process.env.DB_HOST;
    poolConfig.database = process.env.DB_NAME;
    poolConfig.password = process.env.DB_PASSWORD;
    poolConfig.port = process.env.DB_PORT;
}

const pool = new Pool(poolConfig);

module.exports = {
    query: (text, params) => pool.query(text, params),
    connect: () => pool.connect(),
};
