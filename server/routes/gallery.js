const validate = require('../middleware/validation');
const { gallerySchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { cleanMediaUrls, diffRemovedMediaUrls } = require('../utils/media');

router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM gallery ORDER BY sort_order ASC, id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(gallerySchema), async (req, res) => {
    const { image_url, caption, category } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO gallery (image_url, caption, category) VALUES ($1, $2, $3) RETURNING *',
            [image_url, caption, category]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(gallerySchema), async (req, res) => {
    const { image_url, caption, category } = req.body;
    try {
        const previousResult = await db.query('SELECT image_url FROM gallery WHERE id = $1', [req.params.id]);
        const previousRow = previousResult.rows[0] || {};
        const result = await db.query(
            'UPDATE gallery SET image_url = $1, caption = $2, category = $3 WHERE id = $4 RETURNING *',
            [image_url, caption, category, req.params.id]
        );
        await cleanMediaUrls(diffRemovedMediaUrls([previousRow.image_url], [image_url || '']));
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const previousResult = await db.query('SELECT image_url FROM gallery WHERE id = $1', [req.params.id]);
        await db.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
        await cleanMediaUrls(previousResult.rows.map((row) => row.image_url));
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
