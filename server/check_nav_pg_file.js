const db = require('./db');
const fs = require('fs');
const path = require('path');

async function checkNav() {
    try {
        const res = await db.query("SELECT custom_nav FROM about LIMIT 1");
        if (res.rows.length > 0) {
            const content = JSON.stringify(res.rows[0].custom_nav, null, 2);
            fs.writeFileSync(path.join(__dirname, 'nav_output.json'), content);
            console.log("Written to nav_output.json");
        } else {
            console.log("No custom nav found.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkNav();
