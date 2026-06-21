const validate = require('../middleware/validation');
const { experiencesSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');
const { cleanMediaUrls, diffRemovedMediaUrls } = require('../utils/media');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM experiences ORDER BY sort_order ASC, start_date DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(experiencesSchema), async (req, res) => {
    const { company, position, location, start_date, end_date, description, logo_url, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO experiences (company, position, location, start_date, end_date, description, logo_url, details_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [company || '', position || '', location || '', start_date || '', end_date || '', description || '', logo_url || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(experiencesSchema), async (req, res) => {
    const { company, position, location, start_date, end_date, description, logo_url, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE experiences SET company = $1, position = $2, location = $3, start_date = $4, end_date = $5, description = $6, logo_url = $7, details_json = $8 WHERE id = $9 RETURNING *, (SELECT logo_url FROM experiences WHERE id = $9) AS old_logo_url',
            [company || '', position || '', location || '', start_date || '', end_date || '', description || '', logo_url || '', details_json || '', req.params.id]
        );
        if (result.rows.length > 0) {
            const oldLogoUrl = result.rows[0].old_logo_url;
            await cleanMediaUrls(diffRemovedMediaUrls([oldLogoUrl], [logo_url || '']));
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM experiences WHERE id = $1 RETURNING logo_url', [req.params.id]);
        if (result.rows.length > 0) {
            await cleanMediaUrls(result.rows.map((row) => row.logo_url));
        }
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
