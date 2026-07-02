import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { gallerySchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM gallery ORDER BY sort_order ASC, id DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(gallerySchema), async (req: Request, res: Response) => {
    const { image_url, caption, category } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO gallery (image_url, caption, category) VALUES ($1,$2,$3) RETURNING *',
            [image_url||'', caption||'', category||'']
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('gallery', req.body).catch(console.error);
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(gallerySchema), async (req: Request, res: Response) => {
    const { image_url, caption, category } = req.body;
    try {
        const result = await db.query(
            'UPDATE gallery SET image_url=$1,caption=$2,category=$3 WHERE id=$4 RETURNING *',
            [image_url||'', caption||'', category||'', req.params.id]
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('gallery', req.body).catch(console.error);
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM gallery WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
