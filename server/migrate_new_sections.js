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
        
        // Create experiences table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS experiences (
                id SERIAL PRIMARY KEY,
                company VARCHAR(255) NOT NULL,
                position VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                start_date VARCHAR(50),
                end_date VARCHAR(50),
                description TEXT,
                logo_url TEXT
            );
        `);
        console.log('Table experiences created.');

        // Create research_interests table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS research_interests (
                id SERIAL PRIMARY KEY,
                interest VARCHAR(255) NOT NULL,
                details TEXT,
                icon_name VARCHAR(50)
            );
        `);
        console.log('Table research_interests created.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
