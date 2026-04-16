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
        const tables = [
            'academics',
            'experiences',
            'trainings',
            'skills',
            'research',
            'publications',
            'projects',
            'social_links',
            'research_interests'
        ];

        console.log('Adding sort_order column to tables...');

        for (const table of tables) {
            await pool.query(`
                ALTER TABLE ${table} 
                ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
            `);
            console.log(`- Table ${table} updated.`);
        }

        console.log('Migration completed successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
