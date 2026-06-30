import type { Request, Response } from 'express';
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

router.post('/', async (req: Request, res: Response) => {
    const { texts = [], targetLang = 'en' } = req.body || {};

    if (!Array.isArray(texts)) {
        res.status(400).json({ error: 'texts must be an array' });
        return;
    }

    try {
        const translations = await translateTexts(texts.map((text: any) => String(text ?? '')), targetLang);
        res.json({ translations });
    } catch (err: any) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.get('/cache', authenticateToken, async (req: Request, res: Response) => {
    try {
        const cache = await getAllCachedTranslations();
        res.json({ cache });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/cache', authenticateToken, async (req: Request, res: Response) => {
    const { key, translatedText } = req.body;
    if (!key || typeof translatedText !== 'string') {
        res.status(400).json({ error: 'key and translatedText are required' });
        return;
    }
    try {
        const targetLang = key.split('::')[2] || 'en';
        await updateCachedTranslation(key, translatedText);
        clearResponseCache(targetLang);
        await clearRedisResponseCache(targetLang);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/cache', authenticateToken, async (req: Request, res: Response) => {
    const { key } = req.body;
    const targetKey = key || req.query.key;
    if (!targetKey) {
        res.status(400).json({ error: 'key is required' });
        return;
    }
    try {
        const deleteLang = (targetKey as string).split('::')[2] || 'en';
        await deleteCachedTranslation(targetKey as string);
        clearResponseCache(deleteLang);
        await clearRedisResponseCache(deleteLang);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export = router;
