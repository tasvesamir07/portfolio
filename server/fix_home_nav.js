const db = require('./db');

async function fixNav() {
    try {
        const res = await db.query("SELECT custom_nav FROM about LIMIT 1");
        if (res.rows.length === 0) return;

        let nav = res.rows[0].custom_nav;
        let modified = false;

        // nav is likely an array of objects
        if (Array.isArray(nav)) {
            nav = nav.map(item => {
                if (item.name === 'Home' || item.path === '/') {
                    console.log("Found Home item:", item);
                    // Force the translation if it was hardcoded or just to be sure
                    if (item.name_bn !== 'হোম') {
                        item.name_bn = 'হোম';
                        modified = true;
                    }
                }
                return item;
            });
        }

        if (modified) {
            await db.query("UPDATE about SET custom_nav = $1", [JSON.stringify(nav)]);
            console.log("Successfully updated custom_nav in database.");
        } else {
            console.log("No changes needed in database.");
        }
    } catch (err) {
        console.error("Error fixing nav:", err);
    } finally {
        process.exit();
    }
}

fixNav();
