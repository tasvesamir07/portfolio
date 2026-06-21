const express = require('express');
const router = express.Router();
const db = require('../db');
const { localizeDataObject } = require('../middleware/autoTranslate');

const LANGUAGE_HEADER = 'x-translate-language';

router.get('/', async (req, res) => {
    try {
        const resourcesQuery = req.query.resources || '';
        const resources = resourcesQuery.split(',').map((r) => r.trim().toLowerCase());
        const language = req.headers[LANGUAGE_HEADER] || 'en';

        const promises = {};

        if (resources.includes('about')) {
            promises.about = db.query('SELECT * FROM about LIMIT 1').then(r => r.rows[0] || null);
        }
        if (resources.includes('pages')) {
            promises.pages = db.query('SELECT id, title, slug, show_in_nav FROM pages ORDER BY id ASC').then(r => r.rows);
        }
        if (resources.includes('social-links') || resources.includes('social_links')) {
            const socialPromise = db.query('SELECT * FROM social_links ORDER BY sort_order ASC, platform ASC').then(r => r.rows);
            promises['social-links'] = socialPromise;
            promises.socialLinks = socialPromise;
            promises.social_links = socialPromise;
        }
        if (resources.includes('gallery')) {
            promises.gallery = db.query('SELECT * FROM gallery ORDER BY sort_order ASC, id DESC').then(r => r.rows);
        }
        if (resources.includes('gallery-categories') || resources.includes('gallery_categories')) {
            const catPromise = db.query('SELECT * FROM gallery_categories ORDER BY sort_order ASC, name ASC').then(r => r.rows);
            promises['gallery-categories'] = catPromise;
            promises.galleryCategories = catPromise;
            promises.gallery_categories = catPromise;
        }
        if (resources.includes('experiences')) {
            promises.experiences = db.query('SELECT * FROM experiences ORDER BY sort_order ASC, start_date DESC').then(r => r.rows);
        }
        if (resources.includes('trainings')) {
            promises.trainings = db.query('SELECT * FROM trainings ORDER BY sort_order ASC, created_at DESC').then(r => r.rows);
        }
        if (resources.includes('skills')) {
            promises.skills = db.query('SELECT * FROM skills ORDER BY sort_order ASC, category ASC').then(r => r.rows);
        }

        const keys = Object.keys(promises);
        const resolvedDataArray = await Promise.all(keys.map(key => promises[key]));

        const responseData = {};
        for (let i = 0; i < keys.length; i++) {
            responseData[keys[i]] = localizeDataObject(resolvedDataArray[i], language);
        }

        res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
        res.setHeader('Vary', 'Accept-Encoding, X-Translate-Language, x-translate-language');
        res.json(responseData);
    } catch (err) {
        console.error('Batch Page Data Error:', err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

module.exports = router;
