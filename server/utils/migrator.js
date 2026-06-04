const fs = require('fs');
const path = require('path');
const db = require('../db');

const runMigrations = async () => {
    console.log('[Migrator] Checking database schema version...');

    const client = await db.connect();
    try {
        // 1. Ensure migrations tracking table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Read migration files
        const migrationsDir = path.join(__dirname, '../migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.warn('[Migrator] Migrations directory does not exist. Skipping database migrations.');
            return;
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Alphabetic sort guarantees chronological order

        // 3. Get applied migrations
        const { rows } = await client.query('SELECT version FROM schema_migrations');
        const appliedVersions = new Set(rows.map(row => row.version));

        // 4. Run unapplied migrations in order
        for (const file of files) {
            if (appliedVersions.has(file)) {
                continue;
            }

            console.log(`[Migrator] Applying migration: ${file}...`);
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf-8');

            // Run each migration file inside a transaction to ensure rollback on failure
            try {
                await client.query('BEGIN');
                
                // Execute the migration query contents (multiple statements allowed on connection client)
                await client.query(sql);

                // Mark migration version as applied
                await client.query(
                    'INSERT INTO schema_migrations (version) VALUES ($1)',
                    [file]
                );

                await client.query('COMMIT');
                console.log(`[Migrator] Successfully applied: ${file}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`[Migrator] FATAL: Failed applying migration "${file}":`, err.message);
                throw err; // Stop application start on migration failure
            }
        }

        console.log('[Migrator] All database schemas are up to date.');
    } finally {
        client.release();
    }
};

module.exports = {
    runMigrations
};
