const { neon } = require('@neondatabase/serverless');

// We use a "lazy" variable so we only connect when needed
let pool;

const getPool = () => {
    if (pool) return pool;

    const isProduction = process.env.NODE_ENV === 'production' || process.env.CF_PAGES;
    const connectionString = process.env.DATABASE_URL;
    
    if (connectionString && isProduction) {
        const { Pool } = require('@neondatabase/serverless');
        pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false }
        });
    } else if (connectionString) {
        const { Pool } = require('pg');
        pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false }
        });
    } else {
        // Fallback for local development
        const { Pool } = require('pg');
        pool = new Pool({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
        });
    }

    return pool;
};

module.exports = {
    // We wrap the queries to use the lazy pool
    query: async (text, params) => {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.CF_PAGES;
        if (isProduction && process.env.DATABASE_URL) {
            const sql = neon(process.env.DATABASE_URL);
            const result = await sql.query(text, params);
            return Array.isArray(result) ? { rows: result } : result;
        }
        return getPool().query(text, params);
    },
    // Used specifically for transactions
    connect: () => getPool().connect(),
};
