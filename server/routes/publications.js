const validate = require('../middleware/validation');
const { publicationsSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');
const { cleanMediaUrls, diffRemovedMediaUrls } = require('../utils/media');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 0, 200);
        const offset = parseInt(req.query.offset, 10) || 0;

        const countResult = await db.query('SELECT COUNT(*) AS total FROM publications');
        const total = parseInt(countResult.rows[0]?.total, 10) || 0;

        let query = 'SELECT * FROM publications ORDER BY sort_order ASC, pub_year DESC';
        const params = [];
        if (limit > 0) {
            query += ' LIMIT $1 OFFSET $2';
            params.push(limit, offset);
        }
        const result = await db.query(query, params);
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        let data = localizeDataObject(result.rows, language);

        const { normalizeTargetLanguage, shouldServerTranslateResponse, translateResponseData } = require('../middleware/autoTranslate');
        const targetLang = normalizeTargetLanguage(language);
        if (targetLang !== 'en' && shouldServerTranslateResponse(req, targetLang)) {
            data = await translateResponseData(data, targetLang);
        }

        res.setHeader('X-Total-Count', total);

        if (data.length < 50) {
            return res.json(data);
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.flushHeaders();

        res.write('[');
        for (let i = 0; i < data.length; i++) {
            if (i > 0) {
                res.write(',');
            }
            res.write(JSON.stringify(data[i]));
            if (typeof res.flush === 'function') {
                res.flush();
            }
        }
        res.write(']');
        res.end();
    } catch (err) {
        if (res.headersSent) {
            res.end();
        } else {
            res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
        }
    }
});

router.post('/', authenticateToken, validate(publicationsSchema), async (req, res) => {
    const { title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json, doi_url, journal_url, doi } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO publications (title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json, doi_url, journal_url, doi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
            [title || '', thumbnail_url || '', journal_name || '', pub_year || '', authors || '', introduction || '', methods || '', link_url || '', file_url || '', details_json || '', doi_url || '', journal_url || '', doi || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(publicationsSchema), async (req, res) => {
    const { title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json, doi_url, journal_url, doi } = req.body;
    try {
        const result = await db.query(
            'UPDATE publications SET title = $1, thumbnail_url = $2, journal_name = $3, pub_year = $4, authors = $5, introduction = $6, methods = $7, link_url = $8, file_url = $9, details_json = $10, doi_url = $11, journal_url = $12, doi = $13 WHERE id = $14 RETURNING *, (SELECT thumbnail_url FROM publications WHERE id = $14) AS old_thumbnail_url, (SELECT file_url FROM publications WHERE id = $14) AS old_file_url',
            [title || '', thumbnail_url || '', journal_name || '', pub_year || '', authors || '', introduction || '', methods || '', link_url || '', file_url || '', details_json || '', doi_url || '', journal_url || '', doi || '', req.params.id]
        );
        if (result.rows.length > 0) {
            const oldRow = result.rows[0];
            await cleanMediaUrls(diffRemovedMediaUrls(
                [oldRow.old_thumbnail_url, oldRow.old_file_url],
                [thumbnail_url || '', file_url || '']
            ));
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM publications WHERE id = $1 RETURNING thumbnail_url, file_url', [req.params.id]);
        if (result.rows.length > 0) {
            await cleanMediaUrls(result.rows.flatMap((row) => [row.thumbnail_url, row.file_url]));
        }
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
