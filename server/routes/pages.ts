import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { pagesSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');
const sitemapCache = require('../utils/sitemapCache');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req: Request, res: Response) => {
    try {
        const includeContent = String(req.query?.includeContent || '') === '1';
        const result = includeContent
            ? await db.query('SELECT id, title, slug, content, details_json, show_in_nav FROM pages ORDER BY id ASC')
            : await db.query('SELECT id, title, slug, show_in_nav FROM pages ORDER BY id ASC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        const localized = localizeDataObject(result.rows, language);
        if (result.rows[0] && Object.keys(result.rows[0]).some((k: string) => k.endsWith(`_${language}`))) {
            res.locals.dataLocalized = true;
        }
        res.json(localized);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.get('/page', async (req: Request, res: Response) => {
    try {
        const slug = String(req.query?.slug || '').trim();
        const id = Number(req.query?.id);
        let result;

        if (slug) {
            result = await db.query('SELECT * FROM pages WHERE slug = $1', [slug]);
        } else if (Number.isFinite(id) && id > 0) {
            result = await db.query('SELECT * FROM pages WHERE id = $1', [id]);
        } else {
            res.status(400).json({ message: 'slug or id is required' });
            return;
        }

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Page not found' });
            return;
        }
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        const localized = localizeDataObject(result.rows[0], language);
        if (Object.keys(result.rows[0]).some((k: string) => k.endsWith(`_${language}`))) {
            res.locals.dataLocalized = true;
        }
        res.json(localized);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.get('/:slug', async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM pages WHERE slug = $1', [req.params.slug]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Page not found' });
            return;
        }
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        const localized = localizeDataObject(result.rows[0], language);
        if (Object.keys(result.rows[0]).some((k: string) => k.endsWith(`_${language}`))) {
            res.locals.dataLocalized = true;
        }
        res.json(localized);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/', authenticateToken, validate(pagesSchema), async (req: Request, res: Response) => {
    const { title, slug, content, show_in_nav, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO pages (title, slug, content, show_in_nav, details_json) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title || '', slug || '', content || '', Boolean(show_in_nav), details_json || '']
        );
        sitemapCache.invalidate();
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/:id', authenticateToken, validate(pagesSchema), async (req: Request, res: Response) => {
    const { title, slug, content, show_in_nav, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE pages SET title = $1, slug = $2, content = $3, show_in_nav = $4, details_json = $5 WHERE id = $6 RETURNING *',
            [title || '', slug || '', content || '', Boolean(show_in_nav), details_json || '', req.params.id]
        );
        sitemapCache.invalidate();
        res.json(result.rows[0]);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM pages WHERE id = $1', [req.params.id]);
        sitemapCache.invalidate();
        res.sendStatus(204);
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
