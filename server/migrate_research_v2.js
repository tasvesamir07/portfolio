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
        console.log('Updating research table...');
        
        // Add file_url, status, date_text to research
        await pool.query(`
            ALTER TABLE research 
            ADD COLUMN IF NOT EXISTS file_url TEXT,
            ADD COLUMN IF NOT EXISTS status VARCHAR(100),
            ADD COLUMN IF NOT EXISTS date_text VARCHAR(100);
        `);
        
        console.log('Table research updated successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
