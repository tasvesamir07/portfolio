import crypto = require('crypto');
import type { Request, Response, NextFunction } from 'express';
import logger = require('../utils/logger');

const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    (req as any).id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', (req as any).id);

    const startTime = Date.now();

    logger.info({
        reqId: (req as any).id,
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    }, `Incoming ${req.method} ${req.originalUrl || req.url}`);

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info({
            reqId: (req as any).id,
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            durationMs: duration
        }, `Finished ${req.method} ${req.originalUrl || req.url} with ${res.statusCode} in ${duration}ms`);
    });

    next();
};

export = requestLogger;
