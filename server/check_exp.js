const db = require('./db');

async function checkExperiences() {
    try {
        console.log('--- Table Schema ---');
        const schemaRes = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'experiences'
        `);
        schemaRes.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));

        console.log('\n--- Sample Data ---');
        const dataRes = await db.query('SELECT id, company, position, description, details_json FROM experiences LIMIT 1');
        if (dataRes.rows.length > 0) {
            const row = dataRes.rows[0];
            console.log('ID:', row.id);
            console.log('Company:', row.company);
            console.log('Description length:', row.description ? row.description.length : 'NULL');
            console.log('Description starts with:', row.description ? row.description.substring(0, 50) : 'NULL');
            console.log('Details_json length:', row.details_json ? row.details_json.length : 'NULL');
            console.log('Details_json content:', row.details_json);
        } else {
            console.log('No data found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkExperiences();
