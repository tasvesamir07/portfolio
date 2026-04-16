const { Pool } = require('pg');
if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    require('dotenv').config();
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    connect: () => pool.connect(),
};
