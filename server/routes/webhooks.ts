import type { Request, Response } from 'express';
const express = require('express');
const router = express.Router();
const autoTranslate = require('../middleware/autoTranslate');
const logger = require('../utils/logger');

router.post('/content-changed', (req: Request, res: Response) => {
    logger.info({ reqId: (req as any).id }, 'Content changed webhook triggered. Invalidating translation response cache.');

    try {
        autoTranslate.clearResponseCache();

        res.json({
            success: true,
            message: 'Translation response cache cleared and CDN revalidated.'
        });
    } catch (err: any) {
        logger.error({ reqId: (req as any).id, error: err.message }, 'Failed to clear cache on content changed webhook');
        res.status(500).json({ error: 'Failed to invalidate cache' });
    }
});

export = router;
