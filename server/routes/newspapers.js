const validate = require('../middleware/validation');
const { newspapersSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');
const { cleanMediaUrls, diffRemovedMediaUrls } = require('../utils/media');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM newspapers ORDER BY sort_order ASC, created_at DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(newspapersSchema), async (req, res) => {
    const { title, short_description, image_url, link_url } = req.body;
    try {
        // Find next sort_order
        const maxSortRes = await db.query('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM newspapers');
        const nextOrder = (maxSortRes.rows[0]?.max_order ?? -1) + 1;

        const result = await db.query(
            'INSERT INTO newspapers (title, short_description, image_url, link_url, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title || '', short_description || '', image_url || '', link_url || '', nextOrder]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(newspapersSchema), async (req, res) => {
    const { title, short_description, image_url, link_url } = req.body;
    try {
        const result = await db.query(
            'UPDATE newspapers SET title = $1, short_description = $2, image_url = $3, link_url = $4 WHERE id = $5 RETURNING *, (SELECT image_url FROM newspapers WHERE id = $5) AS old_image_url',
            [title || '', short_description || '', image_url || '', link_url || '', req.params.id]
        );
        if (result.rows.length > 0) {
            const oldImageUrl = result.rows[0].old_image_url;
            await cleanMediaUrls(diffRemovedMediaUrls(
                [oldImageUrl],
                [image_url || '']
            ));
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM newspapers WHERE id = $1 RETURNING image_url', [req.params.id]);
        if (result.rows.length > 0) {
            await cleanMediaUrls(result.rows.map(row => row.image_url));
        }
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
