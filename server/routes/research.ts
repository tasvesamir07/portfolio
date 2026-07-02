import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { researchSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM research ORDER BY sort_order ASC, created_at DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(researchSchema), async (req: Request, res: Response) => {
    const { title, description, image_url, link, file_url, status, date_text, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO research (title,description,image_url,link,file_url,status,date_text,details_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
            [title||'',description||'',image_url||'',link||'',file_url||'',status||'',date_text||'',details_json||'']
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('research', req.body).catch(console.error);
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(researchSchema), async (req: Request, res: Response) => {
    const { title, description, image_url, link, file_url, status, date_text, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE research SET title=$1,description=$2,image_url=$3,link=$4,file_url=$5,status=$6,date_text=$7,details_json=$8 WHERE id=$9 RETURNING *',
            [title||'',description||'',image_url||'',link||'',file_url||'',status||'',date_text||'',details_json||'', req.params.id]
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('research', req.body).catch(console.error);
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM research WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
