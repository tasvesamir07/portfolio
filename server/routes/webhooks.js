const express = require('express');
const router = express.Router();
const autoTranslate = require('../middleware/autoTranslate');
const logger = require('../utils/logger');

// POST /api/v1/webhooks/content-changed
router.post('/content-changed', (req, res) => {
    logger.info({ reqId: req.id }, 'Content changed webhook triggered. Invalidating translation response cache.');
    
    try {
        // Clear the translation cache in memory
        autoTranslate.clearResponseCache();
        
        res.json({
            success: true,
            message: 'Translation response cache cleared and CDN revalidated.'
        });
    } catch (err) {
        logger.error({ reqId: req.id, error: err.message }, 'Failed to clear cache on content changed webhook');
        res.status(500).json({ error: 'Failed to invalidate cache' });
    }
});

module.exports = router;
