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
        
        // Ensure publications exists (renamed from old research)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS publications (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                thumbnail_url TEXT,
                journal_name VARCHAR(255),
                pub_year VARCHAR(10),
                authors TEXT,
                introduction TEXT,
                methods TEXT,
                link_url TEXT,
                file_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table publications verified.');

        // Ensure research (new) exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS research (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url TEXT,
                link VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table research verified.');

        // Ensure experiences exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS experiences (
                id SERIAL PRIMARY KEY,
                company VARCHAR(255) NOT NULL,
                position VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                start_date VARCHAR(50),
                end_date VARCHAR(50),
                description TEXT,
                logo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table experiences verified.');

        // Ensure research_interests exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS research_interests (
                id SERIAL PRIMARY KEY,
                interest VARCHAR(255) NOT NULL,
                details TEXT,
                icon_name VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table research_interests verified.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
