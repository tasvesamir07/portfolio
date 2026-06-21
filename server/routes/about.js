const validate = require('../middleware/validation');
const { aboutSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { localizeDataObject } = require('../middleware/autoTranslate');
const { cleanMediaUrls, diffRemovedMediaUrls } = require('../utils/media');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM about LIMIT 1');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows[0], language));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.put('/', authenticateToken, validate(aboutSchema), async (req, res) => {
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
                    bio_text = $1,
                    resume_url = $2,
                    name = $3,
                    location = $4,
                    title = $5,
                    hero_image_url = $6,
                    sub_bio = $7,
                    logo_url = $8,
                    site_name = $9,
                    custom_nav = COALESCE($10::jsonb, custom_nav),
                    custom_sidebar_order = COALESCE($11::jsonb, custom_sidebar_order),
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = $12
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
                    custom_sidebar_order ? JSON.stringify(custom_sidebar_order) : null,
                    existing.id
                ]
            );
            await cleanMediaUrls(diffRemovedMediaUrls(
                [existing.resume_url, existing.hero_image_url, existing.logo_url],
                [resume_url || '', hero_image_url || '', logo_url || '']
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
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update About Error:', err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
