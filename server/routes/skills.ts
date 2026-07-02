import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { skillsSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM skills ORDER BY sort_order ASC, category ASC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(skillsSchema), async (req: Request, res: Response) => {
    const { category, items, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO skills (category, items, details_json) VALUES ($1,$2,$3) RETURNING *',
            [category||'', items||'', details_json||'']
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('skills', req.body).catch(console.error);
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(skillsSchema), async (req: Request, res: Response) => {
    const { category, items, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE skills SET category=$1,items=$2,details_json=$3 WHERE id=$4 RETURNING *',
            [category||'', items||'', details_json||'', req.params.id]
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('skills', req.body).catch(console.error);
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM skills WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
