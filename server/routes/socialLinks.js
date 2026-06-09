const validate = require('../middleware/validation');
const { socialLinksSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');

router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM social_links ORDER BY sort_order ASC, platform ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(socialLinksSchema), async (req, res) => {
    const { platform, url, icon_name, color_class } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO social_links (platform, url, icon_name, color_class) VALUES ($1, $2, $3, $4) RETURNING *',
            [platform, url, icon_name, color_class]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(socialLinksSchema), async (req, res) => {
    const { platform, url, icon_name, color_class } = req.body;
    try {
        const result = await db.query(
            'UPDATE social_links SET platform = $1, url = $2, icon_name = $3, color_class = $4 WHERE id = $5 RETURNING *',
            [platform, url, icon_name, color_class, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM social_links WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
