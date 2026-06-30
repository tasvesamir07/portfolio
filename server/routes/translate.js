const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const { 
    translateTexts, 
    getAllCachedTranslations, 
    updateCachedTranslation, 
    deleteCachedTranslation,
    clearRedisResponseCache
} = require('../translate');
const { clearResponseCache } = require('../middleware/autoTranslate');

router.post('/', async (req, res) => {
    const { texts = [], targetLang = 'en' } = req.body || {};

    if (!Array.isArray(texts)) {
        return res.status(400).json({ error: 'texts must be an array' });
    }

    try {
        const translations = await translateTexts(texts.map((text) => String(text ?? '')), targetLang);
        res.json({ translations });
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

// Admin Cache Review - Get all translations
router.get('/cache', authenticateToken, async (req, res) => {
    try {
        const cache = await getAllCachedTranslations();
        res.json({ cache });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Cache Review - Edit/Update a translation
router.put('/cache', authenticateToken, async (req, res) => {
    const { key, translatedText } = req.body;
    if (!key || typeof translatedText !== 'string') {
        return res.status(400).json({ error: 'key and translatedText are required' });
    }
    try {
        const targetLang = key.split('::')[2] || 'en';
        await updateCachedTranslation(key, translatedText);
        clearResponseCache(targetLang);
        await clearRedisResponseCache(targetLang);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Cache Review - Delete a translation
router.delete('/cache', authenticateToken, async (req, res) => {
    const { key } = req.body;
    const targetKey = key || req.query.key;
    if (!targetKey) {
        return res.status(400).json({ error: 'key is required' });
    }
    try {
        const deleteLang = targetKey.split('::')[2] || 'en';
        await deleteCachedTranslation(targetKey);
        clearResponseCache(deleteLang);
        await clearRedisResponseCache(deleteLang);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
