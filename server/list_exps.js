const db = require('./db');

async function listAllExperiences() {
    try {
        const res = await db.query('SELECT id, company, position, description, details_json FROM experiences');
        res.rows.forEach(row => {
            console.log(`ID: ${row.id} | Company: ${row.company}`);
            console.log(`  Description: "${row.description}"`);
            console.log(`  Details JSON: "${row.details_json}"`);
            console.log('---');
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

listAllExperiences();
