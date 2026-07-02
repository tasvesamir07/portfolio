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

router.patch('/cache/:id/review', authenticateToken, async (req: Request, res: Response) => {
    const { reviewed } = req.body;
    try {
        const db = require('../db');
        await db.query('UPDATE translations SET is_reviewed = $1, updated_at = NOW() WHERE id = $2', [!!reviewed, req.params.id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/run-batch', authenticateToken, async (req: Request, res: Response) => {
    const { lang = 'bn', batchSize = 200 } = req.body;

    try {
        const { extractAllStrings, getHash } = require('../utils/translationExtractor');
        const db = require('../db');
        const { translateTexts } = require('../translate');

        const allStrings = await extractAllStrings(lang);
        const allStringsArray = Array.from(allStrings) as string[];

        // Check which hashes already exist in translations table
        const dbResults = await db.query(
            'SELECT source_hash FROM translations WHERE target_lang = $1',
            [lang]
        );
        const existingHashes = new Set<string>(dbResults.rows.map((row: any) => row.source_hash));

        const missingTexts: string[] = [];
        for (const text of allStringsArray) {
            const hash = getHash(text, lang);
            if (!existingHashes.has(hash)) {
                missingTexts.push(text);
            }
        }

        const total = allStringsArray.length;
        const current = total - missingTexts.length;

        if (missingTexts.length === 0) {
            res.json({
                lang,
                current: total,
                total,
                remaining: 0,
                done: true
            });
            return;
        }

        const batch = missingTexts.slice(0, batchSize);
        await translateTexts(batch, lang);

        res.json({
            lang,
            current: current + batch.length,
            total,
            remaining: missingTexts.length - batch.length,
            done: missingTexts.length - batch.length === 0
        });
    } catch (err: any) {
        console.error('[Auto-Translate Run-Batch] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

export = router;
