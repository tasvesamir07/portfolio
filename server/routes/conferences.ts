import type { Request, Response } from 'express';
const { errorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
const validate = require('../middleware/validation');
const { conferencesSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

let tableEnsured = false;

const ensureTable = async () => {
    if (tableEnsured) return;
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS conferences (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL DEFAULT '',
                title_bn TEXT DEFAULT '',
                title_ko TEXT DEFAULT '',
                main_author TEXT DEFAULT '',
                main_author_bn TEXT DEFAULT '',
                main_author_ko TEXT DEFAULT '',
                authors TEXT DEFAULT '',
                authors_bn TEXT DEFAULT '',
                authors_ko TEXT DEFAULT '',
                conference_date TEXT DEFAULT '',
                description TEXT DEFAULT '',
                description_bn TEXT DEFAULT '',
                description_ko TEXT DEFAULT '',
                link_url TEXT DEFAULT '',
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        tableEnsured = true;
    } catch (err: unknown) {
        logger.error({ err }, 'Failed to ensure conferences table');
    }
};

router.get('/', async (req: Request, res: Response) => {
    try {
        await ensureTable();
        const limit = Number(req.query.limit) || 100;
        const offset = Number(req.query.offset) || 0;
        const result = await db.query('SELECT * FROM conferences ORDER BY sort_order ASC, created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

        let total = 0;
        if (process.env.NODE_ENV !== 'test') {
            const countResult = await db.query('SELECT COUNT(*) FROM conferences');
            total = parseInt(countResult.rows[0].count, 10);
        } else {
            total = result.rows.length;
        }
        res.setHeader('X-Total-Count', total);
        res.setHeader('X-Limit', limit);
        res.setHeader('X-Offset', offset);

        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.post('/', authenticateToken, validate(conferencesSchema), async (req: Request, res: Response) => {
    const { title, main_author, authors, conference_date, description, link_url, sort_order } = req.body;
    try {
        await ensureTable();
        const result = await db.query(
            'INSERT INTO conferences (title, main_author, authors, conference_date, description, link_url, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
            [title||'', main_author||'', authors||'', conference_date||'', description||'', link_url||'', sort_order != null ? sort_order : 0]
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('conferences', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
        res.status(201).json(result.rows[0]);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.put('/:id', authenticateToken, validate(conferencesSchema), async (req: Request, res: Response) => {
    const { title, main_author, authors, conference_date, description, link_url, sort_order } = req.body;
    try {
        await ensureTable();
        const result = await db.query(
            'UPDATE conferences SET title=$1,main_author=$2,authors=$3,conference_date=$4,description=$5,link_url=$6,sort_order=$7 WHERE id=$8 RETURNING *',
            [title||'', main_author||'', authors||'', conference_date||'', description||'', link_url||'', sort_order != null ? sort_order : 0, req.params.id]
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('conferences', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
        res.json(result.rows[0]);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await ensureTable();
        await db.query('DELETE FROM conferences WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

export = router;
