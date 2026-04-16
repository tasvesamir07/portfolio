const { Pool, neon } = require('@neondatabase/serverless');

// We use a "lazy" variable so we only connect when needed
let pool;

const getPool = () => {
    if (pool) return pool;

    const isProduction = process.env.NODE_ENV === 'production' || process.env.CF_PAGES;
    
    const poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false
    };

    // Fallback for local development
    if (!poolConfig.connectionString) {
        poolConfig.user = process.env.DB_USER;
        poolConfig.host = process.env.DB_HOST;
        poolConfig.database = process.env.DB_NAME;
        poolConfig.password = process.env.DB_PASSWORD;
        poolConfig.port = process.env.DB_PORT;
    }

    pool = new Pool(poolConfig);
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
