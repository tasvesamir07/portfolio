const db = require('./db');

async function checkNav() {
    try {
        const res = await db.query("SELECT custom_nav FROM about LIMIT 1");
        if (res.rows.length > 0) {
            console.log("Custom Nav:", JSON.stringify(res.rows[0].custom_nav, null, 2));
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
