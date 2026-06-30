import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { researchInterestsSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM research_interests ORDER BY sort_order ASC, created_at DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(researchInterestsSchema), async (req: Request, res: Response) => {
    const { interest, details, icon_name, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO research_interests (interest, details, icon_name, details_json) VALUES ($1,$2,$3,$4) RETURNING *',
            [interest||'', details||'', icon_name||'', details_json||'']
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(researchInterestsSchema), async (req: Request, res: Response) => {
    const { interest, details, icon_name, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE research_interests SET interest=$1,details=$2,icon_name=$3,details_json=$4 WHERE id=$5 RETURNING *',
            [interest||'', details||'', icon_name||'', details_json||'', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM research_interests WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
