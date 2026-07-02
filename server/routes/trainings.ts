import type { Request, Response } from 'express';
const { errorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
const validate = require('../middleware/validation');
const { trainingsSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req: Request, res: Response) => {
    try {
        const limit = Number(req.query.limit) || 100;
        const offset = Number(req.query.offset) || 0;
        const result = await db.query('SELECT * FROM trainings ORDER BY sort_order ASC, created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

        let total = 0;
        if (process.env.NODE_ENV !== 'test') {
            const countResult = await db.query('SELECT COUNT(*) FROM trainings');
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

router.post('/', authenticateToken, validate(trainingsSchema), async (req: Request, res: Response) => {
    const { title, topic, date_text, instructor, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO trainings (title, topic, date_text, instructor, details_json) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [title||'', topic||'', date_text||'', instructor||'', details_json||'']
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('trainings', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
        res.status(201).json(result.rows[0]);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.put('/:id', authenticateToken, validate(trainingsSchema), async (req: Request, res: Response) => {
    const { title, topic, date_text, instructor, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE trainings SET title=$1,topic=$2,date_text=$3,instructor=$4,details_json=$5 WHERE id=$6 RETURNING *',
            [title||'', topic||'', date_text||'', instructor||'', details_json||'', req.params.id]
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('trainings', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
        res.json(result.rows[0]);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM trainings WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

export = router;
