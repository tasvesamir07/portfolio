const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function dump() {
    try {
        const tables = ['experiences', 'trainings', 'skills'];
        for (const table of tables) {
            console.log(`--- ${table} ---`);
            const res = await pool.query(`SELECT * FROM ${table}`);
            console.log(res.rows);
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}

dump();
