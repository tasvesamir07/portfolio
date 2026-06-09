const logger = require('../utils/logger');
const crypto = require('crypto');

const requestLogger = (req, res, next) => {
    // 1. Generate or capture request ID
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);

    const startTime = Date.now();

    // Log request start
    logger.info({
        reqId: req.id,
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    }, `Incoming ${req.method} ${req.originalUrl || req.url}`);

    // Log request end
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info({
            reqId: req.id,
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            durationMs: duration
        }, `Finished ${req.method} ${req.originalUrl || req.url} with ${res.statusCode} in ${duration}ms`);
    });

    next();
};

module.exports = requestLogger;
