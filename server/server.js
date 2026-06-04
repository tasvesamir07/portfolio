if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    require('dotenv').config();
}

// Startup security check
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET environment variable is not set in production.');
    process.exit(1);
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const db = require('./db');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const csrfMiddleware = require('./middleware/csrf');

const autoTranslate = require('./middleware/autoTranslate');
const { loginLimiter, translateLimiter, messageLimiter, anonymousLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Vercel's reverse proxy for accurate IP rate limiting
app.set('trust proxy', 1);

app.use(compression());
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.upstash.io", "https://*.googleapis.com", "*"],
            connectSrc: ["'self'", "https://*.supabase.co", "https://*.upstash.io", "https://*.googleapis.com", "*"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Cloudflare-Express Compatibility Middleware (MUST BE AT TOP)
app.use((req, res, next) => {
    if (!res.setHeader) {
        res.setHeader = (name, value) => {
            res.set ? res.set(name, value) : (res.headers ? res.headers.set(name, value) : null);
        };
    }
    if (!res.getHeader) {
        res.getHeader = (name) => res.get ? res.get(name) : (res.headers ? res.headers.get(name) : null);
    }
    if (!res.header) res.header = res.setHeader;
    next();
});

// Strict CORS validation configuration
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5000')
    .split(',')
    .map(s => s.trim());

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-translate-language, x-skip-auto-translate');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, ALLOWED_ORIGINS[0]);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-translate-language', 'x-skip-auto-translate']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url}`);
    next();
});

// Invalidate translated response cache on any mutation request.
app.use((req, res, next) => {
    const method = String(req.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        autoTranslate.clearResponseCache();
    }
    next();
});

// Mount the global auto-translate response modifier middleware
app.use(autoTranslate.middleware);

// Static uploads folder for local dev fallback
if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    app.use('/uploads', express.static(path.join(typeof __dirname !== 'undefined' ? __dirname : '', 'uploads')));
}

app.use(csrfMiddleware);

// Ensure CMS database tables exist on startup (non-fatal in serverless)
const ensureCmsTables = async () => {
    try {
        const { runMigrations } = require('./utils/migrator');
        await runMigrations();
    } catch (err) {
        console.error('Database migration failed on startup (non-fatal):', err.message);
    }
};

ensureCmsTables().catch((err) => {
    console.error('Failed to ensure CMS tables:', err);
});

// --- Base Health/Ping endpoints ---
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date(), env: process.env.NODE_ENV }));
app.get('/health', (req, res) => res.json({ status: 'ok', source: 'root' }));

// --- Translation endpoint (rate-limited) ---
app.use('/api/translate', translateLimiter, require('./routes/translate'));
app.use('/api/errors', require('./routes/errors'));

// --- Mounting Refactored Route Modules ---
app.use('/api', require('./routes/admin')); // login handlers, session, forgot password, upload
app.use('/api/about', require('./routes/about'));
app.use('/api/academics', require('./routes/academics'));
app.use('/api/publications', require('./routes/publications'));
app.use('/api/newspapers', require('./routes/newspapers'));
app.use('/api/research', require('./routes/research'));
app.use('/api/research-interests', require('./routes/researchInterests'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/gallery-categories', require('./routes/galleryCategories'));
app.use('/api/social-links', require('./routes/socialLinks'));
app.use('/api/pages', require('./routes/pages'));
app.use('/api/trainings', require('./routes/trainings'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/experiences', require('./routes/experiences'));
app.use('/api/prewarm', require('./routes/prewarm'));
app.use('/api/page-data', require('./routes/pageData'));
app.use('/api/messages', messageLimiter, require('./routes/messages'));
app.use('/api/anonymous-messages', anonymousLimiter, require('./routes/anonymousMessages'));
app.use('/api/reorder', require('./routes/reorder'));

app.get('/sitemap.xml', async (req, res) => {
    res.header('Content-Type', 'application/xml');
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
    try {
        const pagesRes = await db.query("SELECT slug FROM pages WHERE show_in_nav = true");
        const blogUrls = pagesRes.rows.map(row => `
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
        <loc>${baseUrl}/research</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
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
        res.send(xml);
    } catch (err) {
        console.error('Error generating sitemap:', err);
        res.status(500).send('Error generating sitemap');
    }
});

app.get('/robots.txt', (req, res) => {
    res.header('Content-Type', 'text/plain');
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
    res.send(`User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml`);
});

// Catch-all logger to debug 404s
app.use((req, res) => {
    console.log(`[404-Unhandled] ${req.method} ${req.url}`);
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found on server.` });
});

// Start listening locally (Node only)
if (process.env.NODE_ENV !== 'production' && typeof process !== 'undefined' && process.release && process.release.name === 'node') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Global unhandled promise rejection / uncaught exception webhook alerts
if (process.env.ERROR_WEBHOOK_URL) {
    const notifyServerCrash = (error, type) => {
        console.error(`[Server-Crash] ${type}:`, error);
        fetch(process.env.ERROR_WEBHOOK_URL, {
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
        }).catch(err => console.error('[Error-Webhook] Failed to send server error to webhook:', err.message));
    };

    process.on('uncaughtException', (err) => notifyServerCrash(err, 'Uncaught Exception'));
    process.on('unhandledRejection', (reason) => notifyServerCrash(reason, 'Unhandled Rejection'));
}

module.exports = app;
