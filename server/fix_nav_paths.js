const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Proper corrected navigation - using real routes, no hash anchors
const correctedNav = [
    { id: 1, name: 'Home', path: '/', isDropdown: false },
    { 
        id: 3, 
        name: 'Personal Profile', 
        isDropdown: true, 
        dropdownItems: [
            { id: 31, name: 'Education', path: '/academics' },
            { id: 32, name: 'Experiences', path: '/experiences' },
            { id: 33, name: 'Research Interests', path: '/research-interests' }
        ]
    },
    { id: 4, name: 'Research', path: '/research', isDropdown: false },
    { id: 5, name: 'Publications', path: '/publications', isDropdown: false },
    { id: 6, name: 'Gallery', path: '/gallery', isDropdown: false },
    { id: 7, name: 'Contact', path: '/contact', isDropdown: false }
];

async function fixNav() {
    try {
        await pool.query('UPDATE about SET custom_nav = $1', [JSON.stringify(correctedNav)]);
        console.log('Navigation fixed! Items:', correctedNav.map(i => i.name).join(', '));
    } catch (err) {
        console.error('Failed:', err);
    } finally {
        await pool.end();
    }
}

fixNav();
