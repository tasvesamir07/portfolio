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
        await pool.query(`
            CREATE TABLE IF NOT EXISTS social_links (
                id SERIAL PRIMARY KEY,
                platform VARCHAR(50) NOT NULL,
                url TEXT NOT NULL,
                icon_name VARCHAR(50) NOT NULL,
                color_class VARCHAR(100)
            );
        `);
        console.log('Table social_links created or already exists.');

        const checkData = await pool.query('SELECT COUNT(*) FROM social_links');
        if (parseInt(checkData.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO social_links (platform, url, icon_name, color_class) VALUES 
                ('GitHub', 'https://github.com', 'Github', 'hover:text-gray-900'),
                ('LinkedIn', 'https://linkedin.com', 'Linkedin', 'hover:text-blue-600'),
                ('Email', 'mailto:contact@example.com', 'Mail', 'hover:text-orange-600');
            `);
            console.log('Seed data inserted.');
        } else {
            console.log('Table already has data, skipping seed.');
        }
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
