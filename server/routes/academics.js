const validate = require('../middleware/validation');
const { academicsSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');
const { cleanMediaUrls, diffRemovedMediaUrls } = require('../utils/media');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM academics ORDER BY sort_order ASC, start_year DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(academicsSchema), async (req, res) => {
    const { institution, degree, start_year, end_year, logo_url, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO academics (institution, degree, start_year, end_year, logo_url, details_json) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [institution || '', degree || '', start_year || '', end_year || '', logo_url || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(academicsSchema), async (req, res) => {
    const { institution, degree, start_year, end_year, logo_url, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE academics SET institution = $1, degree = $2, start_year = $3, end_year = $4, logo_url = $5, details_json = $6 WHERE id = $7 RETURNING *, (SELECT logo_url FROM academics WHERE id = $7) AS old_logo_url',
            [institution || '', degree || '', start_year || '', end_year || '', logo_url || '', details_json || '', req.params.id]
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
        const result = await db.query('DELETE FROM academics WHERE id = $1 RETURNING logo_url', [req.params.id]);
        if (result.rows.length > 0) {
            await cleanMediaUrls(result.rows.map((row) => row.logo_url));
        }
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
