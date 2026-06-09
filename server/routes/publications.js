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
        const result = await db.query('SELECT * FROM publications ORDER BY sort_order ASC, pub_year DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(publicationsSchema), async (req, res) => {
    const { title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json, doi_url, journal_url } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO publications (title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json, doi_url, journal_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
            [title || '', thumbnail_url || '', journal_name || '', pub_year || '', authors || '', introduction || '', methods || '', link_url || '', file_url || '', details_json || '', doi_url || '', journal_url || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(publicationsSchema), async (req, res) => {
    const { title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json, doi_url, journal_url } = req.body;
    try {
        const previousResult = await db.query('SELECT thumbnail_url, file_url FROM publications WHERE id = $1', [req.params.id]);
        const previousRow = previousResult.rows[0] || {};
        const result = await db.query(
            'UPDATE publications SET title = $1, thumbnail_url = $2, journal_name = $3, pub_year = $4, authors = $5, introduction = $6, methods = $7, link_url = $8, file_url = $9, details_json = $10, doi_url = $11, journal_url = $12 WHERE id = $13 RETURNING *',
            [title || '', thumbnail_url || '', journal_name || '', pub_year || '', authors || '', introduction || '', methods || '', link_url || '', file_url || '', details_json || '', doi_url || '', journal_url || '', req.params.id]
        );
        await cleanMediaUrls(diffRemovedMediaUrls(
            [previousRow.thumbnail_url, previousRow.file_url],
            [thumbnail_url || '', file_url || '']
        ));
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const previousResult = await db.query('SELECT thumbnail_url, file_url FROM publications WHERE id = $1', [req.params.id]);
        await db.query('DELETE FROM publications WHERE id = $1', [req.params.id]);
        await cleanMediaUrls(previousResult.rows.flatMap((row) => [row.thumbnail_url, row.file_url]));
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
