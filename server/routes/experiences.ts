import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { experiencesSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');
const { cleanMediaUrls, diffRemovedMediaUrls } = require('../utils/media');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM experiences ORDER BY sort_order ASC, start_date DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(experiencesSchema), async (req: Request, res: Response) => {
    const { company, position, location, start_date, end_date, description, logo_url, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO experiences (company, position, location, start_date, end_date, description, logo_url, details_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
            [company||'', position||'', location||'', start_date||'', end_date||'', description||'', logo_url||'', details_json||'']
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('experiences', req.body).catch(console.error);
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(experiencesSchema), async (req: Request, res: Response) => {
    const { company, position, location, start_date, end_date, description, logo_url, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE experiences SET company=$1,position=$2,location=$3,start_date=$4,end_date=$5,description=$6,logo_url=$7,details_json=$8 WHERE id=$9 RETURNING *',
            [company||'', position||'', location||'', start_date||'', end_date||'', description||'', logo_url||'', details_json||'', req.params.id]
        );
        if (result.rows.length > 0) {
            const oldLogo = result.rows[0].logo_url;
            await cleanMediaUrls(diffRemovedMediaUrls([oldLogo], [logo_url||'']));
        }
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('experiences', req.body).catch(console.error);
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await db.query('DELETE FROM experiences WHERE id=$1 RETURNING logo_url', [req.params.id]);
        if (result.rows.length > 0 && result.rows[0].logo_url) {
            await cleanMediaUrls([result.rows[0].logo_url]);
        }
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
