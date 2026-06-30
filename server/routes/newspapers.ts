import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { newspapersSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM newspapers ORDER BY sort_order ASC, created_at DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(newspapersSchema), async (req: Request, res: Response) => {
    const { title, short_description, image_url, link_url, sort_order } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO newspapers (title, short_description, image_url, link_url, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [title||'', short_description||'', image_url||'', link_url||'', sort_order != null ? sort_order : 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(newspapersSchema), async (req: Request, res: Response) => {
    const { title, short_description, image_url, link_url, sort_order } = req.body;
    try {
        const result = await db.query(
            'UPDATE newspapers SET title=$1,short_description=$2,image_url=$3,link_url=$4,sort_order=$5 WHERE id=$6 RETURNING *',
            [title||'', short_description||'', image_url||'', link_url||'', sort_order != null ? sort_order : 0, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM newspapers WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
