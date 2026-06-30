const { neon } = require('@neondatabase/serverless');

let pool: any = null;
let neonSql: any = null;

const getNeonSql = () => {
    if (!neonSql && process.env.DATABASE_URL) {
        neonSql = neon(process.env.DATABASE_URL);
    }
    return neonSql;
};

const getPool = () => {
    if (pool) return pool;

    const connectionString = process.env.DATABASE_URL;
    const isNeon = connectionString && connectionString.includes('neon.tech');
    const isProduction = process.env.NODE_ENV === 'production' || process.env.CF_PAGES;

    if (connectionString && isProduction && isNeon) {
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

export = {
    query: async (text: string, params?: any[]) => {
        const connectionString = process.env.DATABASE_URL;
        const isNeon = connectionString && connectionString.includes('neon.tech');
        const isProduction = process.env.NODE_ENV === 'production' || process.env.CF_PAGES;

        if (isProduction && isNeon) {
            const sql = getNeonSql();
            const result = await sql.query(text, params);
            return Array.isArray(result) ? { rows: result } : result;
        }
        return getPool().query(text, params);
    },
    connect: () => getPool().connect(),
};
