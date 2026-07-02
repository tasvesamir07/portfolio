import type { Request, Response } from 'express';
const validate = require('../middleware/validation');
const { aboutSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');
const { cleanMediaUrls, diffRemovedMediaUrls } = require('../utils/media');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM about LIMIT 1');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows[0], language));
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/', authenticateToken, validate(aboutSchema), async (req: Request, res: Response) => {
    const {
        bio_text,
        resume_url,
        name,
        location,
        title,
        hero_image_url,
        sub_bio,
        logo_url,
        site_name,
        custom_nav,
        custom_sidebar_order
    } = req.body;
    try {
        const checkResult = await db.query('SELECT id, resume_url, hero_image_url, logo_url FROM about LIMIT 1');
        const existing = checkResult.rows[0];

        let result;
        if (existing) {
            result = await db.query(
                `UPDATE about SET
                    bio_text = COALESCE($1, bio_text),
                    resume_url = COALESCE($2, resume_url),
                    name = COALESCE($3, name),
                    location = COALESCE($4, location),
                    title = COALESCE($5, title),
                    hero_image_url = COALESCE($6, hero_image_url),
                    sub_bio = COALESCE($7, sub_bio),
                    logo_url = COALESCE($8, logo_url),
                    site_name = COALESCE($9, site_name),
                    custom_nav = COALESCE($10::jsonb, custom_nav),
                    custom_sidebar_order = COALESCE($11::jsonb, custom_sidebar_order),
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = $12
                 RETURNING *`,
                [
                    bio_text !== undefined ? bio_text : null,
                    resume_url !== undefined ? resume_url : null,
                    name !== undefined ? name : null,
                    location !== undefined ? location : null,
                    title !== undefined ? title : null,
                    hero_image_url !== undefined ? hero_image_url : null,
                    sub_bio !== undefined ? sub_bio : null,
                    logo_url !== undefined ? logo_url : null,
                    site_name !== undefined ? site_name : null,
                    custom_nav ? JSON.stringify(custom_nav) : null,
                    custom_sidebar_order ? JSON.stringify(custom_sidebar_order) : null,
                    existing.id
                ]
            );
            await cleanMediaUrls(diffRemovedMediaUrls(
                [existing.resume_url, existing.hero_image_url, existing.logo_url],
                [
                    resume_url !== undefined ? (resume_url || '') : (existing.resume_url || ''),
                    hero_image_url !== undefined ? (hero_image_url || '') : (existing.hero_image_url || ''),
                    logo_url !== undefined ? (logo_url || '') : (existing.logo_url || '')
                ]
            ));
        } else {
            result = await db.query(
                `INSERT INTO about (bio_text, resume_url, name, location, title, hero_image_url, sub_bio, logo_url, site_name, custom_nav, custom_sidebar_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::jsonb, '[]'::jsonb), COALESCE($11::jsonb, '[]'::jsonb))
                 RETURNING *`,
                [
                    bio_text || '',
                    resume_url || '',
                    name || '',
                    location || '',
                    title || '',
                    hero_image_url || '',
                    sub_bio || '',
                    logo_url || '',
                    site_name || '',
                    custom_nav ? JSON.stringify(custom_nav) : null,
                    custom_sidebar_order ? JSON.stringify(custom_sidebar_order) : null
                ]
            );
        }
        const { translateOnSave } = require('../utils/translateOnSave');
        translateOnSave('about', req.body).catch(console.error);
        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Update About Error:', err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

export = router;
