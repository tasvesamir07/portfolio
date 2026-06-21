const validate = require('../middleware/validation');
const { gallerySchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { cleanMediaUrls, diffRemovedMediaUrls } = require('../utils/media');

router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 0, 200);
        const offset = parseInt(req.query.offset, 10) || 0;

        const countResult = await db.query('SELECT COUNT(*) AS total FROM gallery');
        const total = parseInt(countResult.rows[0]?.total, 10) || 0;

        let query = 'SELECT * FROM gallery ORDER BY sort_order ASC, id DESC';
        const params = [];
        if (limit > 0) {
            query += ' LIMIT $1 OFFSET $2';
            params.push(limit, offset);
        }
        const result = await db.query(query, params);
        const language = req.headers['x-translate-language'] || 'en';

        const { localizeDataObject, normalizeTargetLanguage, shouldServerTranslateResponse, translateResponseData } = require('../middleware/autoTranslate');
        let data = localizeDataObject(result.rows, language);
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
        const result = await db.query(
            'UPDATE gallery SET image_url = $1, caption = $2, category = $3 WHERE id = $4 RETURNING *, (SELECT image_url FROM gallery WHERE id = $4) AS old_image_url',
            [image_url, caption, category, req.params.id]
        );
        if (result.rows.length > 0) {
            const oldImageUrl = result.rows[0].old_image_url;
            await cleanMediaUrls(diffRemovedMediaUrls([oldImageUrl], [image_url || '']));
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM gallery WHERE id = $1 RETURNING image_url', [req.params.id]);
        if (result.rows.length > 0) {
            await cleanMediaUrls(result.rows.map((row) => row.image_url));
        }
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
