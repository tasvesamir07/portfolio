import type { Request, Response } from 'express';
const { errorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
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
        const limit = Number(req.query.limit) || 100;
        const offset = Number(req.query.offset) || 0;
        const result = await db.query('SELECT * FROM publications ORDER BY sort_order ASC, created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

        let total = 0;
        if (process.env.NODE_ENV !== 'test') {
            const countResult = await db.query('SELECT COUNT(*) FROM publications');
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

router.post('/', authenticateToken, validate(publicationsSchema), async (req: Request, res: Response) => {
    const { title, thumbnail_url, journal_name, pub_year, authors, main_author, volume, issue, introduction, methods, link_url, file_url, details_json, doi_url, journal_url, doi } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO publications (title,thumbnail_url,journal_name,pub_year,authors,main_author,volume,issue,introduction,methods,link_url,file_url,details_json,doi_url,journal_url,doi) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *',
            [title||'', thumbnail_url||'', journal_name||'', pub_year||'', authors||'', main_author||'', volume||'', issue||'', introduction||'', methods||'', link_url||'', file_url||'', details_json||'', doi_url||'', journal_url||'', doi||'']
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('publications', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
        res.status(201).json(result.rows[0]);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.put('/:id', authenticateToken, validate(publicationsSchema), async (req: Request, res: Response) => {
    const { title, thumbnail_url, journal_name, pub_year, authors, main_author, volume, issue, introduction, methods, link_url, file_url, details_json, doi_url, journal_url, doi } = req.body;
    try {
        const result = await db.query(
            'UPDATE publications SET title=$1,thumbnail_url=$2,journal_name=$3,pub_year=$4,authors=$5,main_author=$6,volume=$7,issue=$8,introduction=$9,methods=$10,link_url=$11,file_url=$12,details_json=$13,doi_url=$14,journal_url=$15,doi=$16 WHERE id=$17 RETURNING *',
            [title||'',thumbnail_url||'',journal_name||'',pub_year||'',authors||'',main_author||'',volume||'',issue||'',introduction||'',methods||'',link_url||'',file_url||'',details_json||'',doi_url||'',journal_url||'',doi||'', req.params.id]
        );
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('publications', req.body).catch((err: any) => logger.error({ err }, 'Translation background error'));
        res.json(result.rows[0]);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM publications WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

export = router;
