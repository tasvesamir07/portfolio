const validate = require('../middleware/validation');
const { researchSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');
const { cleanMediaUrls, diffRemovedMediaUrls } = require('../utils/media');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM research ORDER BY sort_order ASC, created_at DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(researchSchema), async (req, res) => {
    const { title, description, image_url, link, file_url, status, date_text, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO research (title, description, image_url, link, file_url, status, date_text, details_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [title || '', description || '', image_url || '', link || '', file_url || '', status || '', date_text || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(researchSchema), async (req, res) => {
    const { title, description, image_url, link, file_url, status, date_text, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE research SET title = $1, description = $2, image_url = $3, link = $4, file_url = $5, status = $6, date_text = $7, details_json = $8 WHERE id = $9 RETURNING *, (SELECT image_url FROM research WHERE id = $9) AS old_image_url, (SELECT file_url FROM research WHERE id = $9) AS old_file_url',
            [title || '', description || '', image_url || '', link || '', file_url || '', status || '', date_text || '', details_json || '', req.params.id]
        );
        if (result.rows.length > 0) {
            const oldRow = result.rows[0];
            await cleanMediaUrls(diffRemovedMediaUrls(
                [oldRow.old_image_url, oldRow.old_file_url],
                [image_url || '', file_url || '']
            ));
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM research WHERE id = $1 RETURNING image_url, file_url', [req.params.id]);
        if (result.rows.length > 0) {
            await cleanMediaUrls(result.rows.flatMap((row) => [row.image_url, row.file_url]));
        }
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
