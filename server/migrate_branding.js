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
        
        // Add columns to about table
        await pool.query(`
            ALTER TABLE about ADD COLUMN IF NOT EXISTS logo_url TEXT;
            ALTER TABLE about ADD COLUMN IF NOT EXISTS site_name VARCHAR(100);
        `);
        
        // Set default site_name if null
        await pool.query(`
            UPDATE about SET site_name = 'Designer' WHERE site_name IS NULL;
        `);
        
        console.log('Columns logo_url and site_name added to about table.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
