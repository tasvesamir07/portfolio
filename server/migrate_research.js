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
        
        // Add file_url column if it doesn't exist
        await pool.query(`
            ALTER TABLE research_and_publications 
            ADD COLUMN IF NOT EXISTS file_url VARCHAR(255);
        `);
        console.log('Column file_url added to research_and_publications.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
