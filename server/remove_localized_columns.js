const db = require('./db');

async function main() {
    try {
        console.log('Fetching all column names...');
        const res = await db.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND (column_name LIKE '%_en' OR column_name LIKE '%_bn' OR column_name LIKE '%_ko')
        `);

        if (res.rows.length === 0) {
            console.log('No localized columns found.');
            return;
        }

        console.log(`Found ${res.rows.length} localized columns to remove.`);
        
        // Group by table to run one ALTER per table
        const tableActions = {};
        res.rows.forEach(row => {
            if (!tableActions[row.table_name]) tableActions[row.table_name] = [];
            tableActions[row.table_name].push(row.column_name);
        });

        for (const [table, columns] of Object.entries(tableActions)) {
            console.log(`Processing table: ${table}`);
            const dropClauses = columns.map(col => `DROP COLUMN IF EXISTS "${col}"`).join(', ');
            const sql = `ALTER TABLE "${table}" ${dropClauses}`;
            await db.query(sql);
            console.log(`  Removed: ${columns.join(', ')}`);
        }

        console.log('Done cleaning up database columns!');
        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
}

main();
