import type { Request, Response } from 'express';
const { errorResponse } = require('../utils/errorResponse');
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
    } catch (err: unknown) {
        logger.error({ reqId: (req as any).id, error: (err as any).message || String(err) }, 'Failed to clear cache on content changed webhook');
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

export = router;
