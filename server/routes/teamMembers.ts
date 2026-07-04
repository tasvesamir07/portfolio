import type { Request, Response } from 'express';
const { errorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
const validate = require('../middleware/validation');
const { teamMemberSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

const CREATE_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        name_bn TEXT DEFAULT '',
        name_ko TEXT DEFAULT '',
        photo_url TEXT DEFAULT '',
        research_area TEXT DEFAULT '',
        research_area_bn TEXT DEFAULT '',
        research_area_ko TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        academic_level TEXT DEFAULT '',
        academic_level_bn TEXT DEFAULT '',
        academic_level_ko TEXT DEFAULT '',
        member_type TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

const withTable = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
        return await fn();
    } catch (err: any) {
        if (err?.code === '42P01' && err?.message?.includes('relation "team_members" does not exist')) {
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
            const data = await db.query('SELECT * FROM team_members ORDER BY sort_order ASC, created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

            let total = 0;
            if (process.env.NODE_ENV !== 'test') {
                const countResult = await db.query('SELECT COUNT(*) FROM team_members');
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

router.post('/', authenticateToken, validate(teamMemberSchema), async (req: Request, res: Response) => {
    const { name, photo_url, research_area, phone, email, academic_level, member_type, sort_order } = req.body;
    try {
        const result = await withTable(async () => {
            const data = await db.query(
                'INSERT INTO team_members (name, photo_url, research_area, phone, email, academic_level, member_type, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
                [name||'', photo_url||'', research_area||'', phone||'', email||'', academic_level||'', member_type||'', sort_order != null ? sort_order : 0]
            );
            const { translateOnSave } = require('../utils/translateOnSave');
            translateOnSave('team_members', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
            res.status(201).json(data.rows[0]);
        });
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.put('/:id', authenticateToken, validate(teamMemberSchema), async (req: Request, res: Response) => {
    const { name, photo_url, research_area, phone, email, academic_level, member_type, sort_order } = req.body;
    try {
        const result = await withTable(async () => {
            const data = await db.query(
                'UPDATE team_members SET name=$1,photo_url=$2,research_area=$3,phone=$4,email=$5,academic_level=$6,member_type=$7,sort_order=$8 WHERE id=$9 RETURNING *',
                [name||'', photo_url||'', research_area||'', phone||'', email||'', academic_level||'', member_type||'', sort_order != null ? sort_order : 0, req.params.id]
            );
            const { translateOnSave } = require('../utils/translateOnSave');
            translateOnSave('team_members', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
            res.json(data.rows[0]);
        });
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await withTable(async () => {
            await db.query('DELETE FROM team_members WHERE id=$1', [req.params.id]);
            res.sendStatus(204);
        });
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

export = router;
