import fs from 'fs';
import path from 'path';
import logger = require('./logger');
const db = require('../db') as typeof import('../db');

export const runMigrations = async (): Promise<void> => {
    logger.info('[Migrator] Checking database schema version...');

    const client = await db.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const migrationsDir = path.join(__dirname, '../migrations');
        if (!fs.existsSync(migrationsDir)) {
            logger.warn('[Migrator] Migrations directory does not exist. Skipping database migrations.');
            return;
        }

        const files = fs.readdirSync(migrationsDir)
            .filter((file: string) => file.endsWith('.sql'))
            .sort();

        const { rows } = await client.query('SELECT version FROM schema_migrations');
        const appliedVersions = new Set(rows.map((row: { version: string }) => row.version));

        for (const file of files) {
            if (appliedVersions.has(file)) {
                continue;
            }

            logger.info(`[Migrator] Applying migration: ${file}...`);
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf-8');

            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query(
                    'INSERT INTO schema_migrations (version) VALUES ($1)',
                    [file]
                );
                await client.query('COMMIT');
                logger.info(`[Migrator] Successfully applied: ${file}`);
            } catch (err: unknown) {
                await client.query('ROLLBACK');
                logger.error({ err }, `[Migrator] FATAL: Failed applying migration "${file}"`);
                throw err;
            }
        }

        logger.info('[Migrator] All database schemas are up to date.');
    } finally {
        client.release();
    }
};
