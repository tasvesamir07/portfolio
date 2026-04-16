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
        
        // Create categories table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS gallery_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL
            );
        `);
        console.log('Table gallery_categories created or already exists.');

        // Seed initial categories
        const checkData = await pool.query('SELECT COUNT(*) FROM gallery_categories');
        if (parseInt(checkData.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO gallery_categories (name) VALUES 
                ('Events'),
                ('Work'),
                ('Campus');
            `);
            console.log('Seed categories inserted.');
        } else {
            console.log('Categories table already has data, skipping seed.');
        }
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
