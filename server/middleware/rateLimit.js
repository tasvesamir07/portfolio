const { Ratelimit } = require('@upstash/ratelimit');
const { Redis } = require('@upstash/redis');

let redis = null;
// Do not use Redis-backed rate limiting during testing to avoid mocked Redis client incompatibilities
if (process.env.NODE_ENV !== 'test' && process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    try {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_URL,
            token: process.env.UPSTASH_REDIS_TOKEN
        });
        console.log('[Rate-Limit] Upstash Redis client initialized successfully.');
    } catch (e) {
        console.error('[Rate-Limit] Failed to initialize Redis:', e.message);
    }
} else {
    console.warn('[Rate-Limit] Upstash Redis credentials not set or in test environment. Falling back to in-memory rate limiting.');
}

const createRateLimiter = ({ windowMs, max, message, prefix }) => {
    if (redis) {
        const ratelimit = new Ratelimit({
            redis: redis,
            limiter: Ratelimit.slidingWindow(max, `${Math.ceil(windowMs / 1000)} s`),
            analytics: true,
            prefix: prefix || 'ratelimit',
        });
        
        return async (req, res, next) => {
            const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
            try {
                const { success, limit, reset, remaining } = await ratelimit.limit(ip);
                
                res.setHeader('X-RateLimit-Limit', limit);
                res.setHeader('X-RateLimit-Remaining', remaining);
                res.setHeader('X-RateLimit-Reset', reset);
                
                if (!success) {
                    return res.status(429).json({ error: message });
                }
                next();
            } catch (err) {
                console.error('[Rate-Limit] Redis error:', err.message);
                next();
            }
        };
    } else {
        const rateLimit = require('express-rate-limit');
        return rateLimit({
            windowMs,
            max,
            message: { error: message }
        });
    }
};

const loginLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many login attempts. Try again later.',
    prefix: 'ratelimit:login'
});

const translateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Translation rate limit exceeded.',
    prefix: 'ratelimit:translate'
});

const messageLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 3,
    message: 'Too many messages sent. Try again later.',
    prefix: 'ratelimit:message'
});

const anonymousLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many anonymous messages. Try again later.',
    prefix: 'ratelimit:anonymous'
});

const globalLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP. Please try again later.',
    prefix: 'ratelimit:global'
});

module.exports = { loginLimiter, translateLimiter, messageLimiter, anonymousLimiter, globalLimiter };
