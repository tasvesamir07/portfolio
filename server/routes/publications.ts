import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { publicationsSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM publications ORDER BY sort_order ASC, created_at DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(publicationsSchema), async (req: Request, res: Response) => {
    const { title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json, doi_url, journal_url, doi } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO publications (title,thumbnail_url,journal_name,pub_year,authors,introduction,methods,link_url,file_url,details_json,doi_url,journal_url,doi) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
            [title||'', thumbnail_url||'', journal_name||'', pub_year||'', authors||'', introduction||'', methods||'', link_url||'', file_url||'', details_json||'', doi_url||'', journal_url||'', doi||'']
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('publications', req.body).catch(console.error);
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(publicationsSchema), async (req: Request, res: Response) => {
    const { title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json, doi_url, journal_url, doi } = req.body;
    try {
        const result = await db.query(
            'UPDATE publications SET title=$1,thumbnail_url=$2,journal_name=$3,pub_year=$4,authors=$5,introduction=$6,methods=$7,link_url=$8,file_url=$9,details_json=$10,doi_url=$11,journal_url=$12,doi=$13 WHERE id=$14 RETURNING *',
            [title||'',thumbnail_url||'',journal_name||'',pub_year||'',authors||'',introduction||'',methods||'',link_url||'',file_url||'',details_json||'',doi_url||'',journal_url||'',doi||'', req.params.id]
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('publications', req.body).catch(console.error);
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM publications WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
