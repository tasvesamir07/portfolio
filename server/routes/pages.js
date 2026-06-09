const validate = require('../middleware/validation');
const { pagesSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req, res) => {
    try {
        const includeContent = String(req.query?.includeContent || '') === '1';
        const result = includeContent
            ? await db.query('SELECT id, title, slug, content, details_json, show_in_nav FROM pages ORDER BY id ASC')
            : await db.query('SELECT id, title, slug, show_in_nav FROM pages ORDER BY id ASC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

// Single page fetcher by id or slug
router.get('/page', async (req, res) => {
    try {
        const slug = String(req.query?.slug || '').trim();
        const id = Number(req.query?.id);
        let result;

        if (slug) {
            result = await db.query('SELECT * FROM pages WHERE slug = $1', [slug]);
        } else if (Number.isFinite(id) && id > 0) {
            result = await db.query('SELECT * FROM pages WHERE id = $1', [id]);
        } else {
            return res.status(400).json({ message: 'slug or id is required' });
        }

        if (result.rows.length === 0) return res.status(404).json({ message: 'Page not found' });
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows[0], language));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.get('/:slug', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM pages WHERE slug = $1', [req.params.slug]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Page not found' });
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows[0], language));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(pagesSchema), async (req, res) => {
    const { title, slug, content, show_in_nav, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO pages (title, slug, content, show_in_nav, details_json) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title || '', slug || '', content || '', Boolean(show_in_nav), details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(pagesSchema), async (req, res) => {
    const { title, slug, content, show_in_nav, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE pages SET title = $1, slug = $2, content = $3, show_in_nav = $4, details_json = $5 WHERE id = $6 RETURNING *',
            [title || '', slug || '', content || '', Boolean(show_in_nav), details_json || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM pages WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
