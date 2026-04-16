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
            ALTER TABLE about 
            ADD COLUMN IF NOT EXISTS custom_nav JSONB DEFAULT '[]'::jsonb;
        `);
        console.log('Added custom_nav column to about table.');

        // Seed with a decent default if it's completely empty arrays
        const res = await pool.query('SELECT custom_nav FROM about LIMIT 1');
        if (res.rows.length > 0) {
            const currentNav = res.rows[0].custom_nav;
            if (!currentNav || currentNav.length === 0) {
                const defaultNav = [
                    { id: 1, name: 'Home', path: '#hero', isDropdown: false },
                    { id: 2, name: 'About', path: '#about', isDropdown: false },
                    { 
                        id: 3, 
                        name: 'Personal Profile', 
                        isDropdown: true, 
                        dropdownItems: [
                            { id: 31, name: 'Experiences', path: '#experiences' },
                            { id: 32, name: 'Academics', path: '#academics' },
                            { id: 33, name: 'Skills & Settings', path: '#experiences' }
                        ]
                    },
                    { id: 4, name: 'Research', path: '#research', isDropdown: false },
                    { id: 5, name: 'Publications', path: '#publications', isDropdown: false },
                    { id: 6, name: 'Gallery', path: '#gallery', isDropdown: false },
                    { id: 7, name: 'Contact', path: '#contact', isDropdown: false }
                ];
                await pool.query('UPDATE about SET custom_nav = $1', [JSON.stringify(defaultNav)]);
                console.log('Seeded custom_nav with default topology.');
            } else {
                console.log('custom_nav already populated.');
            }
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
