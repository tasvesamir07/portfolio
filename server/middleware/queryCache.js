const { Redis } = require('@upstash/redis');
const crypto = require('crypto');

let redis = null;
if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    try {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_URL,
            token: process.env.UPSTASH_REDIS_TOKEN
        });
        console.log('[Query-Cache] Upstash Redis client initialized successfully.');
    } catch (e) {
        console.error('[Query-Cache] Failed to initialize Redis:', e.message);
    }
} else {
    console.warn('[Query-Cache] Upstash Redis credentials not set. Falling back to memory cache.');
}

const memoryCache = new Map();
const activeRefreshes = new Map();

// Timing constants
const FRESH_TTL_MS = 300 * 1000; // 5 minutes fresh
const STALE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours stale
const REDIS_TTL_SECS = 24 * 60 * 60; // Store in Redis for 24 hours

const getCacheKey = (req) => {
    const lang = req.headers['x-translate-language'] || 'en';
    const url = req.originalUrl || req.url;
    return `api_cache::${lang}::${url}`;
};

const generateETag = (body) => {
    const stringBody = typeof body === 'string' ? body : JSON.stringify(body);
    return `W/"${crypto.createHash('md5').update(stringBody).digest('hex')}"`;
};

const saveToCache = (key, payload) => {
    const cacheEntry = {
        data: payload,
        savedAt: Date.now()
    };

    // Store in memory
    memoryCache.set(key, cacheEntry);

    // Store in Redis
    if (redis) {
        redis.set(key, JSON.stringify(cacheEntry), { ex: REDIS_TTL_SECS })
            .catch(e => console.warn('[Query-Cache] Redis background save error:', e.message));
    }
};

const triggerBackgroundRefresh = (req, res, key) => {
    const mockReq = Object.create(req);
    mockReq.headers = { ...req.headers };
    mockReq.bypassCache = true;

    const mockRes = Object.create(res);
    mockRes.statusCode = 200;
    mockRes.headers = {};
    mockRes.locals = { ...(res?.locals || {}) };

    mockRes.setHeader = function(name, value) {
        this.headers[name.toLowerCase()] = value;
        return this;
    };

    mockRes.status = function(code) {
        this.statusCode = code;
        return this;
    };

    mockRes.json = function(payload) {
        saveToCache(key, payload);
        activeRefreshes.delete(key);
        return this;
    };

    mockRes.send = function(payload) {
        try {
            const parsed = JSON.parse(payload);
            saveToCache(key, parsed);
        } catch {
            saveToCache(key, payload);
        }
        activeRefreshes.delete(key);
        return this;
    };

    mockRes.end = function() {
        activeRefreshes.delete(key);
        return this;
    };

    if (req.app && typeof req.app.handle === 'function') {
        try {
            req.app.handle(mockReq, mockRes);
        } catch (e) {
            console.warn('[Query-Cache] Background refresh dispatch error:', e.message);
            activeRefreshes.delete(key);
        }
    } else {
        activeRefreshes.delete(key);
    }
};

const queryCacheMiddleware = async (req, res, next) => {
    if (req.bypassCache) {
        return next();
    }

    const method = String(req.method || 'GET').toUpperCase();
    const fullPath = (req.originalUrl || '').split('?')[0];
    const isApiPath = fullPath.startsWith('/api/');
    const isTranslateEndpoint = fullPath === '/api/translate' || fullPath === '/api/v1/translate';
    const isPrewarmEndpoint = fullPath === '/api/prewarm' || fullPath === '/api/v1/prewarm';
    
    // Cache invalidation on POST, PUT, DELETE
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
        try {
            memoryCache.clear();
            if (redis) {
                const keys = await redis.keys('api_cache::*');
                if (keys && keys.length > 0) {
                    await Promise.all(keys.map(k => redis.del(k)));
                }
                console.log('[Query-Cache] Invalidated all API cache on mutation.');
            } else {
                console.log('[Query-Cache] Invalidated all in-memory API cache on mutation.');
            }
        } catch (e) {
            console.error('[Query-Cache] Invalidation error:', e.message);
        }
        return next();
    }
    
    // Only cache GET requests to API paths, excluding translate, prewarm and session endpoints
    if (method !== 'GET' || !isApiPath || isTranslateEndpoint || isPrewarmEndpoint || fullPath.endsWith('/session')) {
        return next();
    }
    
    // Bypass cache for authenticated requests
    if (req.headers.authorization) {
        return next();
    }
    
    const key = getCacheKey(req);
    
    // Check cache
    try {
        let cachedEntry = null;
        let cacheSource = null;

        // Check in-memory first
        if (memoryCache.has(key)) {
            const entry = memoryCache.get(key);
            const age = Date.now() - entry.savedAt;
            if (age < STALE_TTL_MS) {
                cachedEntry = entry;
                cacheSource = 'Memory';
            } else {
                memoryCache.delete(key);
            }
        }

        // Check Redis if not found in memory
        if (!cachedEntry && redis) {
            const cachedValue = await redis.get(key);
            if (cachedValue) {
                const parsed = typeof cachedValue === 'string' ? JSON.parse(cachedValue) : cachedValue;
                // Support legacy cached data structure
                const entry = (parsed && parsed.savedAt) ? parsed : { data: parsed, savedAt: Date.now() };
                const age = Date.now() - entry.savedAt;
                if (age < STALE_TTL_MS) {
                    cachedEntry = entry;
                    cacheSource = 'Redis';
                    // Populate memory cache
                    memoryCache.set(key, entry);
                }
            }
        }

        // Handle cache hit (Fresh or Stale)
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
                return res.json(cachedData);
            } else {
                // Stale-While-Revalidate pattern
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
                return res.json(cachedData);
            }
        }
    } catch (err) {
        console.warn('[Query-Cache] Read error:', err.message);
    }
    
    // Intercept res.json to cache misses and compute ETag
    const originalJson = res.json.bind(res);
    res.json = (payload) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                // Compute ETag
                const etag = generateETag(payload);
                res.setHeader('ETag', etag);
                
                // If browser sent If-None-Match matching computed ETag, we can return 304 here.
                if (req.headers['if-none-match'] === etag) {
                    res.status(304).end();
                    return;
                }
                
                saveToCache(key, payload);
            } catch (e) {
                console.warn('[Query-Cache] Write error:', e.message);
            }
        }
        
        res.setHeader('X-Cache', 'MISS');
        return originalJson(payload);
    };
    
    next();
};

module.exports = queryCacheMiddleware;
