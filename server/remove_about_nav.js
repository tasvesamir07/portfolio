const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function removeAboutFromNav() {
    try {
        const res = await pool.query('SELECT custom_nav FROM about LIMIT 1');
        if (res.rows.length === 0) {
            console.log('No about row found.');
            return;
        }
        
        let nav = res.rows[0].custom_nav || [];
        
        // Remove any item named 'About' (case-insensitive)
        const filtered = nav.filter(item => item.name?.toLowerCase() !== 'about');
        
        await pool.query('UPDATE about SET custom_nav = $1', [JSON.stringify(filtered)]);
        console.log('Removed About from custom_nav. Remaining items:', filtered.map(i => i.name).join(', '));
    } catch (err) {
        console.error('Failed:', err);
    } finally {
        await pool.end();
    }
}

removeAboutFromNav();
