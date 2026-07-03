import crypto = require('crypto');
import type { Request, Response, NextFunction } from 'express';
const logger = require('../utils/logger');

const { Redis } = require('@upstash/redis');

let redis: any = null;
if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    try {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_URL,
            token: process.env.UPSTASH_REDIS_TOKEN
        });
        logger.info('[Query-Cache] Upstash Redis client initialized successfully.');
    } catch (e: unknown) {
        logger.error({ err: e }, '[Query-Cache] Failed to initialize Redis');
    }
} else {
    logger.warn('[Query-Cache] Upstash Redis credentials not set. Falling back to memory cache.');
}

const memoryCache = new Map<string, { data: unknown; savedAt: number }>();
const activeRefreshes = new Map<string, boolean>();

const FRESH_TTL_MS = 300 * 1000;
const STALE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
    data: unknown;
    savedAt: number;
}

const getCacheKey = (req: Request): string => {
    const url = req.originalUrl || req.url;
    const lang = req.headers['x-translate-language'] || 'en';
    const cleanUrl = url.replace(/[\s\r\n]/g, '');
    const cleanLang = String(lang).replace(/[\s\r\n]/g, '');
    return `api_cache_v7::${cleanLang}::${cleanUrl}`;
};

const generateETag = (data: unknown): string => {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    const hash = crypto.createHash('sha1').update(str).digest('base64');
    return `W/"${hash.slice(0, 27)}"`;
};

const saveToCache = async (key: string, data: unknown): Promise<void> => {
    const entry: CacheEntry = { data, savedAt: Date.now() };
    memoryCache.set(key, entry);

    if (redis) {
        try {
            await redis.set(key, JSON.stringify(entry), { ex: Math.ceil(STALE_TTL_MS / 1000) });
        } catch (e: unknown) {
            logger.warn({ err: e }, '[Query-Cache] Failed to save to Redis cache');
        }
    }
};

const triggerBackgroundRefresh = (req: Request, res: Response, key: string): void => {
    const mockReq = {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        headers: { ...req.headers },
        bypassCache: true,
        app: req.app
    } as any;

    const mockRes = {
        statusCode: 200,
        setHeader: () => {},
        status: function(code: number) { this.statusCode = code; return this; },
        json: function(payload: unknown) {
            if (this.statusCode >= 200 && this.statusCode < 300) {
                saveToCache(key, payload).finally(() => {
                    activeRefreshes.delete(key);
                });
            } else {
                activeRefreshes.delete(key);
            }
            return this;
        },
        end: function() {
            activeRefreshes.delete(key);
            return this;
        },
        send: function(payload: unknown) {
            if (this.statusCode >= 200 && this.statusCode < 300) {
                saveToCache(key, payload).finally(() => {
                    activeRefreshes.delete(key);
                });
            } else {
                activeRefreshes.delete(key);
            }
            return this;
        }
    } as any;

    const app = req.app as any;
    if (app && typeof app.handle === 'function') {
        try {
            app.handle(mockReq, mockRes);
        } catch (e: unknown) {
            logger.warn({ err: e }, '[Query-Cache] Background refresh dispatch error');
            activeRefreshes.delete(key);
        }
    } else {
        activeRefreshes.delete(key);
    }
};

const queryCacheMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if ((req as any).bypassCache) {
        next();
        return;
    }

    const method = String(req.method || 'GET').toUpperCase();
    const fullPath = (req.originalUrl || '').split('?')[0];
    const isApiPath = fullPath.startsWith('/api/');
    const isTranslateEndpoint = fullPath === '/api/translate' || fullPath === '/api/v1/translate';
    const isPrewarmEndpoint = fullPath === '/api/prewarm' || fullPath === '/api/v1/prewarm';

    if (['POST', 'PUT', 'DELETE'].includes(method)) {
        try {
            memoryCache.clear();
            if (redis) {
                const keys = await redis.keys('api_cache_v7::*');
                if (keys && keys.length > 0) {
                    await Promise.all((keys as string[]).map((k: string) => redis.del(k)));
                }
                logger.info('[Query-Cache] Invalidated all API cache on mutation.');
            } else {
                logger.info('[Query-Cache] Invalidated all in-memory API cache on mutation.');
            }
        } catch (e: unknown) {
            logger.error({ err: e }, '[Query-Cache] Invalidation error');
        }
        next();
        return;
    }

    if (method !== 'GET' || !isApiPath || isTranslateEndpoint || isPrewarmEndpoint || fullPath.endsWith('/session')) {
        next();
        return;
    }

    if (req.headers.authorization) {
        next();
        return;
    }

    const key = getCacheKey(req);

    try {
        let cachedEntry: CacheEntry | null = null;
        let cacheSource: string | null = null;

        if (memoryCache.has(key)) {
            const entry = memoryCache.get(key)!;
            const age = Date.now() - entry.savedAt;
            if (age < STALE_TTL_MS) {
                cachedEntry = entry;
                cacheSource = 'Memory';
            } else {
                memoryCache.delete(key);
            }
        }

        if (!cachedEntry && redis) {
            const cachedValue = await redis.get(key);
            if (cachedValue) {
                const parsed = typeof cachedValue === 'string' ? JSON.parse(cachedValue) : cachedValue;
                const entry: CacheEntry = (parsed && parsed.savedAt) ? parsed : { data: parsed, savedAt: Date.now() };
                const age = Date.now() - entry.savedAt;
                if (age < STALE_TTL_MS) {
                    cachedEntry = entry;
                    cacheSource = 'Redis';
                    memoryCache.set(key, entry);
                }
            }
        }

        if (cachedEntry) {
            const age = Date.now() - cachedEntry.savedAt;
            const isFresh = age < FRESH_TTL_MS;
            const cachedData = cachedEntry.data;
            const etag = generateETag(cachedData);

            res.setHeader('ETag', etag);

            if (isFresh) {
                if (req.headers['if-none-match'] === etag) {
                    res.status(304).end();
                    return;
                }
                res.setHeader('X-Cache', `HIT-${cacheSource}`);
                res.locals.dataLocalized = true;
                res.json(cachedData);
                return;
            } else {
                if (!activeRefreshes.has(key)) {
                    activeRefreshes.set(key, true);
                    triggerBackgroundRefresh(req, res, key);
                }

                if (req.headers['if-none-match'] === etag) {
                    res.status(304).end();
                    return;
                }
                res.setHeader('X-Cache', `STALE-${cacheSource}`);
                res.locals.dataLocalized = true;
                res.json(cachedData);
                return;
            }
        }
    } catch (err: unknown) {
        logger.warn({ err }, '[Query-Cache] Read error');
    }

    const originalJson = res.json.bind(res);
    (res as any).json = (payload: unknown) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                const etag = generateETag(payload);
                res.setHeader('ETag', etag);

                if (req.headers['if-none-match'] === etag) {
                    res.status(304).end();
                    return;
                }

                saveToCache(key, payload);
            } catch (e: unknown) {
                logger.warn({ err: e }, '[Query-Cache] Write error');
            }
        }

        res.setHeader('X-Cache', 'MISS');
        return originalJson(payload);
    };

    next();
};

export = queryCacheMiddleware;
