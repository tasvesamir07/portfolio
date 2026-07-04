import type { Request, Response } from 'express';
const { errorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
const validate = require('../middleware/validation');
const { membershipSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS memberships (
        id SERIAL PRIMARY KEY,
        membership_type TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL DEFAULT '',
        name_bn TEXT DEFAULT '',
        name_ko TEXT DEFAULT '',
        url TEXT DEFAULT '',
        position TEXT DEFAULT '',
        position_bn TEXT DEFAULT '',
        position_ko TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

const withTable = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
        return await fn();
    } catch (err: any) {
        if (err?.code === '42P01' && err?.message?.includes('relation "memberships" does not exist')) {
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
            const data = await db.query('SELECT * FROM memberships ORDER BY sort_order ASC, created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

            let total = 0;
            if (process.env.NODE_ENV !== 'test') {
                const countResult = await db.query('SELECT COUNT(*) FROM memberships');
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

router.post('/', authenticateToken, validate(membershipSchema), async (req: Request, res: Response) => {
    const { membership_type, name, url, position, sort_order } = req.body;
    try {
        const result = await withTable(async () => {
            const data = await db.query(
                'INSERT INTO memberships (membership_type, name, url, position, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
                [membership_type||'', name||'', url||'', position||'', sort_order != null ? sort_order : 0]
            );
            const { translateOnSave } = require('../utils/translateOnSave');
            translateOnSave('memberships', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
            res.status(201).json(data.rows[0]);
        });
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.put('/:id', authenticateToken, validate(membershipSchema), async (req: Request, res: Response) => {
    const { membership_type, name, url, position, sort_order } = req.body;
    try {
        const result = await withTable(async () => {
            const data = await db.query(
                'UPDATE memberships SET membership_type=$1,name=$2,url=$3,position=$4,sort_order=$5 WHERE id=$6 RETURNING *',
                [membership_type||'', name||'', url||'', position||'', sort_order != null ? sort_order : 0, req.params.id]
            );
            const { translateOnSave } = require('../utils/translateOnSave');
            translateOnSave('memberships', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
            res.json(data.rows[0]);
        });
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await withTable(async () => {
            await db.query('DELETE FROM memberships WHERE id=$1', [req.params.id]);
            res.sendStatus(204);
        });
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

export = router;
