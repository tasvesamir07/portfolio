const { Pool } = require('@neondatabase/serverless');

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
    query: (text, params) => getPool().query(text, params),
    connect: () => getPool().connect(),
};
