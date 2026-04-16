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
        
        // Add new columns to research_and_publications
        await pool.query(`
            ALTER TABLE research_and_publications 
            ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
            ADD COLUMN IF NOT EXISTS journal_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS pub_year INTEGER,
            ADD COLUMN IF NOT EXISTS authors TEXT,
            ADD COLUMN IF NOT EXISTS introduction TEXT,
            ADD COLUMN IF NOT EXISTS methods TEXT;
        `);
        console.log('Columns thumbnail_url, journal_name, pub_year, authors, introduction, methods added to research_and_publications.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
