import type { Request, Response } from 'express';
const { errorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
const validate = require('../middleware/validation');
const { projectSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        title_bn TEXT DEFAULT '',
        title_ko TEXT DEFAULT '',
        funding_organization TEXT DEFAULT '',
        funding_organization_bn TEXT DEFAULT '',
        funding_organization_ko TEXT DEFAULT '',
        duration TEXT DEFAULT '',
        duration_bn TEXT DEFAULT '',
        duration_ko TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

const withTable = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
        return await fn();
    } catch (err: any) {
        if (err?.code === '42P01' && err?.message?.includes('relation "projects" does not exist')) {
            await db.query(CREATE_TABLE_SQL);
            return await fn();
        }
        throw err;
    }
};

router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await withTable(async () => {
            const limit = Number(req.query.limit) || 100;
            const offset = Number(req.query.offset) || 0;
            const data = await db.query('SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

            let total = 0;
            if (process.env.NODE_ENV !== 'test') {
                const countResult = await db.query('SELECT COUNT(*) FROM projects');
                total = parseInt(countResult.rows[0].count, 10);
            } else {
                total = data.rows.length;
            }
            res.setHeader('X-Total-Count', total);
            res.setHeader('X-Limit', limit);
            res.setHeader('X-Offset', offset);

            const language = req.headers[LANGUAGE_HEADER] || 'en';
            res.json(localizeDataObject(data.rows, language));
        });
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.post('/', authenticateToken, validate(projectSchema), async (req: Request, res: Response) => {
    const { title, funding_organization, duration, sort_order } = req.body;
    try {
        const result = await withTable(async () => {
            const data = await db.query(
                'INSERT INTO projects (title, funding_organization, duration, sort_order) VALUES ($1,$2,$3,$4) RETURNING *',
                [title||'', funding_organization||'', duration||'', sort_order != null ? sort_order : 0]
            );
            const { translateOnSave } = require('../utils/translateOnSave');
            translateOnSave('projects', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
            res.status(201).json(data.rows[0]);
        });
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.put('/:id', authenticateToken, validate(projectSchema), async (req: Request, res: Response) => {
    const { title, funding_organization, duration, sort_order } = req.body;
    try {
        const result = await withTable(async () => {
            const data = await db.query(
                'UPDATE projects SET title=$1,funding_organization=$2,duration=$3,sort_order=$4 WHERE id=$5 RETURNING *',
                [title||'', funding_organization||'', duration||'', sort_order != null ? sort_order : 0, req.params.id]
            );
            const { translateOnSave } = require('../utils/translateOnSave');
            translateOnSave('projects', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
            res.json(data.rows[0]);
        });
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await withTable(async () => {
            await db.query('DELETE FROM projects WHERE id=$1', [req.params.id]);
            res.sendStatus(204);
        });
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

export = router;
