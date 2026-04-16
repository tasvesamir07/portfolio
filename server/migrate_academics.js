const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function migrate() {
    try {
        console.log('Connecting to database:', process.env.DB_NAME);
        
        // Add logo_url to academics
        await pool.query(`
            ALTER TABLE academics 
            ADD COLUMN IF NOT EXISTS logo_url TEXT;
        `);
        console.log('Column logo_url added to academics table.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
