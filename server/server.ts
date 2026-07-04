import type { Request, Response, NextFunction } from 'express';
const { errorResponse } = require('./utils/errorResponse');
const logger = require('./utils/logger');

if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    require('dotenv').config();
}

const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
    });
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    logger.error('FATAL ERROR: JWT_SECRET environment variable is not set in production.');
    process.exit(1);
}

const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const db = require('./db');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const csrfMiddleware = require('./middleware/csrf');

const autoTranslate = require('./middleware/autoTranslate');
const { loginLimiter, translateLimiter, messageLimiter, anonymousLimiter, globalLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

app.use(compression());

app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.query && req.query.lang) {
        req.headers['x-translate-language'] = req.query.lang as string;
    }
    next();
});

const queryCacheMiddleware = require('./middleware/queryCache');
app.use(queryCacheMiddleware);

app.use((req: Request, res: Response, next: NextFunction) => {
    const method = String(req.method || 'GET').toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) { next(); return; }
    globalLimiter(req, res, next);
});

app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", (req: any, res: any) => `'nonce-${res.locals.nonce}'`, "https://www.googletagmanager.com"],
            styleSrc: ["'self'", (req: any, res: any) => `'nonce-${res.locals.nonce}'`, "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.upstash.io", "https://*.googleapis.com", "https://images.unsplash.com"],
            connectSrc: ["'self'", "https://*.supabase.co", "https://*.upstash.io", "https://*.googleapis.com", "https://www.google-analytics.com", "https://*.google-analytics.com"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use((req: any, res: any, next: NextFunction) => {
    if (!res.setHeader) {
        res.setHeader = (name: string, value: string) => {
            res.set ? res.set(name, value) : (res.headers ? res.headers.set(name, value) : null);
        };
    }
    if (!res.getHeader) {
        res.getHeader = (name: string) => res.get ? res.get(name) : (res.headers ? res.headers.get(name) : null);
    }
    if (!res.header) res.header = res.setHeader;
    next();
});

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5000')
    .split(',')
    .map(s => s.trim());

app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-translate-language', 'x-skip-auto-translate']
}));

app.use(bodyParser.json({ limit: '4mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '4mb' }));

const requestLogger = require('./middleware/requestLogger');
app.use(requestLogger);

app.use((req: Request, res: Response, next: NextFunction) => {
    const method = String(req.method || 'GET').toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) { next(); return; }

    const fullPath = req.originalUrl || req.path || '';
    const apiMatch = fullPath.match(/^\/api\/v1\/([^/?]+)/);
    if (apiMatch) {
        autoTranslate.clearResponseCache(apiMatch[1]);
    } else {
        autoTranslate.clearResponseCache();
    }
    next();
});

app.use(autoTranslate.middleware);

if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    app.use('/uploads', express.static(path.join(typeof __dirname !== 'undefined' ? __dirname : '', 'uploads')));
}

app.use(csrfMiddleware);

const ensureCmsTables = async (): Promise<void> => {
    if (process.env.NODE_ENV === 'test') return;
    try {
        const { runMigrations } = require('./utils/migrator');
        await runMigrations();
    } catch (err: unknown) {
        logger.error({ err }, 'Database migration failed on startup (non-fatal):', (err as any).message || String(err));
    }
};

ensureCmsTables().catch((err: unknown) => {
    logger.error({ err }, 'Failed to ensure CMS tables:', (err as any).message || String(err));
});

const v1Router = express.Router();

v1Router.get('/ping', (req: Request, res: Response) => res.json({ status: 'ok', timestamp: new Date() }));
v1Router.get('/health', async (req: Request, res: Response) => {
    const health: any = {
        status: 'ok',
        timestamp: new Date(),
        env: process.env.NODE_ENV,
        checks: {
            database: { status: 'unknown', latencyMs: null },
            redis: { status: 'unknown' },
            cache: { l1Size: 0, maxEntries: 0 }
        }
    };

    const dbStart = Date.now();
    try {
        await db.query('SELECT 1');
        health.checks.database.status = 'connected';
        health.checks.database.latencyMs = Date.now() - dbStart;
    } catch (dbErr: unknown) {
        health.status = 'error';
        health.checks.database.status = 'error';
        health.checks.database.error = (dbErr as any).message || String(dbErr);
    }

    try {
        const { Redis } = require('@upstash/redis');
        if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
            const redisClient = new Redis({
                url: process.env.UPSTASH_REDIS_URL,
                token: process.env.UPSTASH_REDIS_TOKEN
            });
            const redisStart = Date.now();
            await redisClient.ping();
            health.checks.redis.status = 'connected';
            health.checks.redis.latencyMs = Date.now() - redisStart;
        } else {
            health.checks.redis.status = 'not_configured';
        }
    } catch (redisErr: unknown) {
        health.checks.redis.status = 'error';
        health.checks.redis.error = (redisErr as any).message || String(redisErr);
    }

    try {
        const { getCacheStats } = require('./translate');
        const stats = getCacheStats();
        health.checks.cache.l1Size = stats.l1Size;
        health.checks.cache.maxEntries = stats.maxEntries;
        if (stats.redisConnected) {
            health.checks.redis.status = 'connected';
        }
    } catch (cacheErr: unknown) {
        health.checks.cache.error = (cacheErr as any).message || String(cacheErr);
    }

    res.status(health.status === 'ok' ? 200 : 500).json(health);
});

v1Router.use('/translate', translateLimiter, require('./routes/translate'));
v1Router.use('/errors', require('./routes/errors'));

v1Router.use('/', require('./routes/admin'));
v1Router.use('/about', require('./routes/about'));
v1Router.use('/academics', require('./routes/academics'));
v1Router.use('/publications', require('./routes/publications'));
v1Router.use('/conferences', require('./routes/conferences'));
v1Router.use('/newspapers', require('./routes/newspapers'));
v1Router.use('/research-interests', require('./routes/researchInterests'));
v1Router.use('/gallery', require('./routes/gallery'));
v1Router.use('/gallery-categories', require('./routes/galleryCategories'));
v1Router.use('/social-links', require('./routes/socialLinks'));
v1Router.use('/pages', require('./routes/pages'));
v1Router.get('/page', async (req: Request, res: Response) => {
    try {
        const slug = String(req.query?.slug || '').trim();
        const id = Number(req.query?.id);
        const LANGUAGE_HEADER = 'x-translate-language';
        const { localizeDataObject } = require('./middleware/autoTranslate');
        let result: any;

        if (slug) {
            result = await db.query('SELECT * FROM pages WHERE slug = $1', [slug]);
        } else if (Number.isFinite(id) && id > 0) {
            result = await db.query('SELECT * FROM pages WHERE id = $1', [id]);
        } else {
            res.status(400).json({ message: 'slug or id is required' });
            return;
        }

        if (result.rows.length === 0) {
            res.status(404).json({ message: 'Page not found' });
            return;
        }
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        const localized = localizeDataObject(result.rows[0], language);
        res.json(localized);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});
v1Router.use('/trainings', require('./routes/trainings'));
v1Router.use('/skills', require('./routes/skills'));
v1Router.use('/experiences', require('./routes/experiences'));
v1Router.use('/prewarm', require('./routes/prewarm'));
v1Router.use('/page-data', require('./routes/pageData'));
v1Router.use('/messages', require('./routes/messages'));
v1Router.use('/anonymous-messages', require('./routes/anonymousMessages'));
v1Router.use('/reorder', require('./routes/reorder'));
v1Router.use('/webhooks', require('./routes/webhooks'));

v1Router.get('/docs', (req: Request, res: Response) => {
    try {
        const spec = require('./docs/openapi.json');
        res.json(spec);
    } catch (err: unknown) {
        res.status(500).json({ error: 'Failed to load API documentation' });
    }
});

app.use('/api/v1', v1Router);

const deprecationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Deprecation', 'true');
    const sunsetDate = new Date();
    sunsetDate.setMonth(sunsetDate.getMonth() + 1);
    res.setHeader('Sunset', sunsetDate.toUTCString());
    res.setHeader('Link', `<${req.protocol}://${req.get('host')}/api/v1${req.path}>; rel="successor-version"`);
    next();
};

app.use('/api', deprecationMiddleware, v1Router);

app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'Azizul Haque Portfolio API is running.',
        status: 'healthy',
        website: 'https://azizulhaque.vercel.app'
    });
});

app.get('/health', (req: Request, res: Response) => res.json({ status: 'ok', source: 'root' }));

app.get('/sitemap.xml', async (req: Request, res: Response) => {
    res.header('Content-Type', 'application/xml');

    const sitemapCache = require('./utils/sitemapCache');
    const cachedXml = sitemapCache.get();
    if (cachedXml) {
        res.setHeader('X-Cache', 'HIT-Sitemap');
        res.send(cachedXml);
        return;
    }

    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
    try {
        const pagesRes = await db.query("SELECT slug FROM pages WHERE show_in_nav = true");
        const blogUrls = pagesRes.rows.map((row: any) => `
    <url>
        <loc>${baseUrl}/blog/${row.slug}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>`).join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/academics</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/experiences</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/research-interests</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/publications</loc>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${baseUrl}/gallery</loc>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>${baseUrl}/newspaper</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/contact</loc>
        <changefreq>yearly</changefreq>
        <priority>0.5</priority>
    </url>${blogUrls}
</urlset>`;

        sitemapCache.set(xml);
        res.setHeader('X-Cache', 'MISS-Sitemap');
        res.send(xml);
    } catch (err: unknown) {
        logger.error({ err }, 'Error generating sitemap');
        res.status(500).send('Error generating sitemap');
    }
});

app.get('/robots.txt', (req: Request, res: Response) => {
    res.header('Content-Type', 'text/plain');
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
    res.send(`User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml`);
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error({ err }, '[Global-Error]');
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
});

app.use((req: Request, res: Response) => {
    logger.info({ method: req.method, url: req.url }, '[404-Unhandled]');
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found on server.` });
});

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' && typeof process !== 'undefined' && (process as any).release && (process as any).release.name === 'node') {
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}

if (process.env.ERROR_WEBHOOK_URL) {
    const notifyServerCrash = (error: any, type: string) => {
        logger.error({ err: error }, `[Server-Crash] ${type}:`, error);
        fetch(process.env.ERROR_WEBHOOK_URL!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: `🚨 Server-Side ${type} Detected`,
                    color: 16711680,
                    fields: [
                        { name: 'Message', value: String(error?.message || error || 'No message').slice(0, 1024) },
                        { name: 'Stack', value: `\`\`\`js\n${String(error?.stack || 'No stack').slice(0, 1000)}\n\`\`\`` }
                    ],
                    timestamp: new Date().toISOString()
                }]
            })
        }).catch((err: Error) => logger.error({ err }, '[Error-Webhook] Failed to send server error to webhook:', err.message));
    };

    process.on('uncaughtException', (err: Error) => notifyServerCrash(err, 'Uncaught Exception'));
    process.on('unhandledRejection', (reason: any) => notifyServerCrash(reason, 'Unhandled Rejection'));
}

if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

export = app;
