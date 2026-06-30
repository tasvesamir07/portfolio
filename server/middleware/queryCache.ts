import crypto = require('crypto');
import type { Request, Response, NextFunction } from 'express';

const { Redis } = require('@upstash/redis');

let redis: any = null;
if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    try {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_URL,
            token: process.env.UPSTASH_REDIS_TOKEN
        });
        console.log('[Query-Cache] Upstash Redis client initialized successfully.');
    } catch (e: any) {
        console.error('[Query-Cache] Failed to initialize Redis:', e.message);
    }
} else {
    console.warn('[Query-Cache] Upstash Redis credentials not set. Falling back to memory cache.');
}

const memoryCache = new Map<string, { data: unknown; savedAt: number }>();
const activeRefreshes = new Map<string, boolean>();

const FRESH_TTL_MS = 300 * 1000;
const STALE_TTL_MS = 24 * 60 * 60 * 1000;
const REDIS_TTL_SECS = 24 * 60 * 60;

const getCacheKey = (req: Request): string => {
    const lang = (req.headers['x-translate-language'] as string) || 'en';
    const url = req.originalUrl || req.url || '';
    return `api_cache_v6::${lang}::${url}`;
};

const generateETag = (body: unknown): string => {
    const stringBody = typeof body === 'string' ? body : JSON.stringify(body);
    return `W/"${crypto.createHash('md5').update(stringBody).digest('hex')}"`;
};

interface CacheEntry {
    data: unknown;
    savedAt: number;
}

const saveToCache = (key: string, payload: unknown): void => {
    const cacheEntry: CacheEntry = {
        data: payload,
        savedAt: Date.now()
    };

    memoryCache.set(key, cacheEntry);

    if (redis) {
        redis.set(key, JSON.stringify(cacheEntry), { ex: REDIS_TTL_SECS })
            .catch((e: Error) => console.warn('[Query-Cache] Redis background save error:', e.message));
    }
};

const triggerBackgroundRefresh = (req: Request, res: Response, key: string): void => {
    const mockReq = Object.create(req) as any;
    mockReq.headers = { ...req.headers };
    mockReq.bypassCache = true;

    const mockRes = Object.create(res) as any;
    mockRes.statusCode = 200;
    mockRes.headers = {};
    mockRes.locals = { ...(res?.locals || {}) };

    mockRes.setHeader = function (name: string, value: string) {
        this.headers[name.toLowerCase()] = value;
        return this;
    };

    mockRes.status = function (code: number) {
        this.statusCode = code;
        return this;
    };

    mockRes.json = function (payload: unknown) {
        saveToCache(key, payload);
        activeRefreshes.delete(key);
        return this;
    };

    mockRes.send = function (payload: string) {
        try {
            const parsed = JSON.parse(payload);
            saveToCache(key, parsed);
        } catch {
            saveToCache(key, payload);
        }
        activeRefreshes.delete(key);
        return this;
    };

    mockRes.end = function () {
        activeRefreshes.delete(key);
        return this;
    };

    const app = req.app as any;
    if (app && typeof app.handle === 'function') {
        try {
            app.handle(mockReq, mockRes);
        } catch (e: any) {
            console.warn('[Query-Cache] Background refresh dispatch error:', e.message);
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
                const keys = await redis.keys('api_cache_v6::*');
                if (keys && keys.length > 0) {
                    await Promise.all((keys as string[]).map((k: string) => redis.del(k)));
                }
                console.log('[Query-Cache] Invalidated all API cache on mutation.');
            } else {
                console.log('[Query-Cache] Invalidated all in-memory API cache on mutation.');
            }
        } catch (e: any) {
            console.error('[Query-Cache] Invalidation error:', e.message);
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
    } catch (err: any) {
        console.warn('[Query-Cache] Read error:', err.message);
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
            } catch (e: any) {
                console.warn('[Query-Cache] Write error:', e.message);
            }
        }

        res.setHeader('X-Cache', 'MISS');
        return originalJson(payload);
    };

    next();
};

export = queryCacheMiddleware;
