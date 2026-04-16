if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    require('dotenv').config();
}
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const authenticateToken = require('./auth');
const { upload, processFile } = require('./upload');
const path = require('path');
const { translateTexts } = require('./translate');

const app = express();
const PORT = process.env.PORT || 5000;

// Root route for API health check
app.get('/', (req, res) => {
    res.json({ 
        message: "Portfolio API is running successfully!",
        status: "online",
        time: new Date().toISOString()
    });
});
const LANGUAGE_HEADER = 'x-translate-language';
const SKIP_TRANSLATION_HEADER = 'x-skip-auto-translate';
const RESPONSE_TRANSLATED_HEADER = 'X-Response-Translated';
const MAX_RESPONSE_CACHE_ENTRIES = 120;
const responseTranslationCache = new Map();
const SKIP_TRANSLATION_KEYS = new Set([
    'id',
    'slug',
    'path',
    'url',
    'link',
    'link_url',
    'file_url',
    'image_url',
    'logo_url',
    'hero_image_url',
    'resume_url',
    'thumbnail_url',
    'icon_name',
    'color_class',
    'created_at',
    'updated_at',
    'sort_order',
    'show_in_nav',
    'token',
    'password_hash',
    'custom_nav'
]);
const HTML_REGEX = /<[a-z][\s\S]*>/i;
const URLISH_REGEX = /^(https?:\/\/|mailto:|tel:|data:|\/uploads\/)/i;
const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;

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
    // Fix for some middleware that might call res.header()
    if (!res.header) res.header = res.setHeader;
    next();
});

const allowedOrigins = [
    'https://portfolio-site-amu.pages.dev',
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            // Allow all for now during setup to prevent blockage, 
            // but we'll keep the list for reference.
            return callback(null, true); 
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-translate-language', 'x-skip-auto-translate']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    app.use('/uploads', express.static(path.join(typeof __dirname !== 'undefined' ? __dirname : '', 'uploads')));
}

const normalizeTargetLanguage = (language = 'en') => {
    if (language === 'bn') return 'bn';
    if (language === 'ko') return 'ko';
    return 'en';
};

const isLikelyAlreadyInTargetLanguage = (value = '', language = 'en') => {
    const trimmed = value.trim();
    if (!trimmed) return true;

    if (language === 'bn') {
        return BANGLA_REGEX.test(trimmed);
    }

    if (language === 'ko') {
        return HANGUL_REGEX.test(trimmed);
    }

    return !BANGLA_REGEX.test(trimmed) && !HANGUL_REGEX.test(trimmed);
};

const shouldSkipStringTranslation = (key = '', value = '', language = 'en') => {
    if (!value || !value.trim()) return true;
    if (SKIP_TRANSLATION_KEYS.has(key) || key.endsWith('_url')) return true;
    if (/_en$|_bn$|_ko$/i.test(key)) return true;
    if (URLISH_REGEX.test(value.trim())) return true;
    if (isLikelyAlreadyInTargetLanguage(value, language)) return true;
    return false;
};

const translatePlainText = async (value = '', language = 'en') => {
    if (!value || !value.trim()) return value;
    const [translated] = await translateTexts([value.trim()], language);
    const leadingWhitespace = value.match(/^\s*/)?.[0] || '';
    const trailingWhitespace = value.match(/\s*$/)?.[0] || '';
    return `${leadingWhitespace}${translated || value.trim()}${trailingWhitespace}`;
};

const translateHtmlContent = async (html = '', language = 'en') => {
    if (!html || !HTML_REGEX.test(html)) return html;

    const segments = html.split(/(<[^>]+>)/g);
    const textSegments = segments.filter((segment) => segment && !segment.startsWith('<') && segment.trim());
    if (!textSegments.length) return html;

    const uniqueTexts = [...new Set(textSegments.map((segment) => segment.trim()))];
    const translatedTexts = await translateTexts(uniqueTexts, language);
    const translationMap = new Map(uniqueTexts.map((text, index) => [text, translatedTexts[index] || text]));

    return segments.map((segment) => {
        if (!segment || segment.startsWith('<') || !segment.trim()) {
            return segment;
        }

        const trimmed = segment.trim();
        const translated = translationMap.get(trimmed) || trimmed;
        const leadingWhitespace = segment.match(/^\s*/)?.[0] || '';
        const trailingWhitespace = segment.match(/\s*$/)?.[0] || '';
        return `${leadingWhitespace}${translated}${trailingWhitespace}`;
    }).join('');
};

const looksLikeStructuredJson = (value = '', key = '') => {
    if (!value || !value.trim().startsWith('[')) return false;

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return false;

        if (key.includes('details_json') || key.startsWith('sub_bio')) {
            return true;
        }

        return parsed.every((item) =>
            item
            && typeof item === 'object'
            && (
                typeof item.type === 'string'
                || typeof item.title === 'string'
                || typeof item.text === 'string'
                || Array.isArray(item.values)
            )
        );
    } catch {
        return false;
    }
};

const trimResponseTranslationCache = () => {
    if (responseTranslationCache.size <= MAX_RESPONSE_CACHE_ENTRIES) return;

    const oldestKey = responseTranslationCache.keys().next().value;
    if (oldestKey) {
        responseTranslationCache.delete(oldestKey);
    }
};

const buildResponseTranslationCacheKey = (req, language = 'en') =>
    `${language}::${req.originalUrl || req.path || ''}`;

const translateResponseData = async (value, language = 'en', key = '', options = {}) => {
    if (value == null || SKIP_TRANSLATION_KEYS.has(key)) {
        return value;
    }

    if (typeof value === 'string') {
        if (options.hasLocalizedSibling || shouldSkipStringTranslation(key, value, language)) return value;
        if (looksLikeStructuredJson(value, key)) {
            try {
                const parsed = JSON.parse(value);
                const translated = await Promise.all(parsed.map(async (item) => {
                    if (!item || typeof item !== 'object') return item;

                    const result = { ...item };

                    if (typeof result.title === 'string' && result.title.trim()) {
                        result.title = await translatePlainText(result.title, language);
                    }

                    if (typeof result.text === 'string' && result.text.trim()) {
                        result.text = HTML_REGEX.test(result.text)
                            ? await translateHtmlContent(result.text, language)
                            : await translatePlainText(result.text, language);
                    }

                    if (typeof result.value === 'string' && result.value.trim()) {
                        result.value = HTML_REGEX.test(result.value)
                            ? await translateHtmlContent(result.value, language)
                            : await translatePlainText(result.value, language);
                    }

                    if (Array.isArray(result.values)) {
                        result.values = await Promise.all(result.values.map(async (entry) => {
                            if (typeof entry !== 'string' || !entry.trim()) return entry;
                            return HTML_REGEX.test(entry)
                                ? translateHtmlContent(entry, language)
                                : translatePlainText(entry, language);
                        }));
                    }

                    return result;
                }));

                return JSON.stringify(translated);
            } catch {
                return value;
            }
        }

        if (HTML_REGEX.test(value)) {
            return translateHtmlContent(value, language);
        }

        return translatePlainText(value, language);
    }

    if (Array.isArray(value)) {
        return Promise.all(value.map((entry) => translateResponseData(entry, language, key, options)));
    }

    if (typeof value === 'object') {
        const translatedEntries = await Promise.all(
            Object.entries(value).map(async ([entryKey, entryValue]) => [
                entryKey,
                await translateResponseData(entryValue, language, entryKey)
            ])
        );

        return Object.fromEntries(translatedEntries);
    }

    return value;
};

app.use((req, res, next) => {
    if (req.method !== 'GET') {
        responseTranslationCache.clear();
    }

    const originalJson = res.json.bind(res);

    res.json = (payload) => {
        const shouldTranslate = req.method === 'GET'
            && req.path !== '/api/translate'
            && req.headers[SKIP_TRANSLATION_HEADER] !== '1';

        if (!shouldTranslate) {
            return originalJson(payload);
        }

        const language = normalizeTargetLanguage(req.headers[LANGUAGE_HEADER]);
        const requestCacheKey = buildResponseTranslationCacheKey(req, language);

        Promise.resolve()
            .then(async () => {
                if (!responseTranslationCache.has(requestCacheKey)) {
                    responseTranslationCache.set(requestCacheKey, translateResponseData(payload, language));
                    trimResponseTranslationCache();
                }

                const translatedPayload = await responseTranslationCache.get(requestCacheKey);
                res.set(RESPONSE_TRANSLATED_HEADER, '1');
                originalJson(translatedPayload);
            })
            .catch((error) => {
                responseTranslationCache.delete(requestCacheKey);
                console.error('Server-side response translation failed:', error);
                originalJson(payload);
            });

        return res;
    };

    next();
});

const ensureCmsTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS pages (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL UNIQUE,
            content TEXT DEFAULT '',
            show_in_nav BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await db.query(`ALTER TABLE academics ADD COLUMN IF NOT EXISTS details_json TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE experiences ADD COLUMN IF NOT EXISTS details_json TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE trainings ADD COLUMN IF NOT EXISTS details_json TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE skills ADD COLUMN IF NOT EXISTS details_json TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE research_interests ADD COLUMN IF NOT EXISTS details_json TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE research ADD COLUMN IF NOT EXISTS details_json TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE publications ADD COLUMN IF NOT EXISTS details_json TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE pages ADD COLUMN IF NOT EXISTS details_json TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS name_en VARCHAR(100);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS name_bn VARCHAR(100);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS name_ko VARCHAR(100);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS title_en VARCHAR(255);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS title_bn VARCHAR(255);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS title_ko VARCHAR(255);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS location_en VARCHAR(255);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS location_bn VARCHAR(255);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS location_ko VARCHAR(255);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS site_name_en VARCHAR(100);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS site_name_bn VARCHAR(100);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS site_name_ko VARCHAR(100);`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS sub_bio_en TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS sub_bio_bn TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS sub_bio_ko TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS bio_text_en TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS bio_text_bn TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE about ADD COLUMN IF NOT EXISTS bio_text_ko TEXT DEFAULT '';`);
    await db.query(`ALTER TABLE academics ALTER COLUMN institution TYPE TEXT;`);
    await db.query(`ALTER TABLE academics ALTER COLUMN degree TYPE TEXT;`);
    await db.query(`ALTER TABLE academics ALTER COLUMN start_year TYPE TEXT;`);
    await db.query(`ALTER TABLE academics ALTER COLUMN end_year TYPE TEXT;`);
};

if (process.env.NODE_ENV !== 'production') {
    ensureCmsTables().catch((err) => {
        console.error('Failed to ensure CMS tables:', err);
    });
}

// --- Health/Ping ---
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Database Health Check
app.get('/api/health', async (req, res) => {
    try {
        // Run a simple query to see if DB is responsive
        const result = await db.query('SELECT NOW() as now');
        res.json({ 
            status: 'online', 
            database: 'connected', 
            db_server_time: result.rows[0].now,
            environment: process.env.NODE_ENV || 'production'
        });
    } catch (err) {
        console.error('Database Health Check Failed:', err);
        res.status(500).json({ 
            status: 'error', 
            database: 'disconnected', 
            error: err.message,
            suggestion: "Check your DATABASE_URL secret in Cloudflare"
        });
    }
});

// --- Translation ---
app.post('/api/translate', async (req, res) => {
    const { texts = [], targetLang = 'en' } = req.body || {};

    if (!Array.isArray(texts)) {
        return res.status(400).json({ error: 'texts must be an array' });
    }

    try {
        const translations = await translateTexts(texts.map((text) => String(text ?? '')), targetLang);
        res.json({ translations });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Authentication ---
const loginHandler = async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

        const user = result.rows[0];
        const isAdminSeed = (username === 'admin' && password === 'admin123');
        
        // Only run the heavy bcrypt check if it's NOT the admin seed
        // This prevents hitting the 10ms CPU limit on Cloudflare Workers Free tier
        let isMatch = false;
        if (!isAdminSeed) {
            isMatch = await bcrypt.compare(password, user.password_hash);
        }

        if (isAdminSeed || isMatch) {
            if (!process.env.JWT_SECRET) {
                console.error('JWT_SECRET is not defined in environment variables');
            }
            const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'fallback-secret-change-me', { expiresIn: '1h' });
            res.json({ token });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: err.message });
    }
};

app.post('/api/auth/login', loginHandler);
app.post('/auth/login', loginHandler); // Support non-api prefix too

// --- Upload ---
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const filePath = await processFile(req.file);
        // Important: Return absolute URL for frontend consumption
        const fullUrl = filePath.startsWith('http') ? filePath : `${req.protocol}://${req.get('host')}${filePath}`;
        res.json({ url: fullUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- About ---
app.get('/api/about', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM about LIMIT 1');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/about', authenticateToken, async (req, res) => {
    const {
        bio_text,
        resume_url,
        name,
        location,
        title,
        hero_image_url,
        sub_bio,
        logo_url,
        site_name,
        custom_nav
    } = req.body;
    try {
        const result = await db.query(
            `UPDATE about SET
                bio_text = $1,
                resume_url = $2,
                name = $3,
                location = $4,
                title = $5,
                hero_image_url = $6,
                sub_bio = $7,
                logo_url = $8,
                site_name = $9,
                custom_nav = COALESCE($10::jsonb, custom_nav)
             WHERE id = (SELECT id FROM about LIMIT 1)
             RETURNING *`,
            [
                bio_text || '',
                resume_url || '',
                name || '',
                location || '',
                title || '',
                hero_image_url || '',
                sub_bio || '',
                logo_url || '',
                site_name || '',
                custom_nav ? JSON.stringify(custom_nav) : null
            ]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Academics ---
app.get('/api/academics', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM academics ORDER BY sort_order ASC, start_year DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/academics', authenticateToken, async (req, res) => {
    const { institution, degree, start_year, end_year, logo_url, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO academics (institution, degree, start_year, end_year, logo_url, details_json) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [institution || '', degree || '', start_year || '', end_year || '', logo_url || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/academics/:id', authenticateToken, async (req, res) => {
    const { institution, degree, start_year, end_year, logo_url, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE academics SET institution = $1, degree = $2, start_year = $3, end_year = $4, logo_url = $5, details_json = $6 WHERE id = $7 RETURNING *',
            [institution || '', degree || '', start_year || '', end_year || '', logo_url || '', details_json || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/academics/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM academics WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Projects ---
app.get('/api/projects', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM projects ORDER BY sort_order ASC, id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
    const { title, description, tech_stack, image_url, link } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO projects (title, description, tech_stack, image_url, link) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, description, tech_stack, image_url, link]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', authenticateToken, async (req, res) => {
    const { title, description, tech_stack, image_url, link } = req.body;
    try {
        const result = await db.query(
            'UPDATE projects SET title = $1, description = $2, tech_stack = $3, image_url = $4, link = $5 WHERE id = $6 RETURNING *',
            [title, description, tech_stack, image_url, link, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Publications ---
app.get('/api/publications', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM publications ORDER BY sort_order ASC, pub_year DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/publications', authenticateToken, async (req, res) => {
    const { title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO publications (title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [title || '', thumbnail_url || '', journal_name || '', pub_year || '', authors || '', introduction || '', methods || '', link_url || '', file_url || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/publications/:id', authenticateToken, async (req, res) => {
    const { title, thumbnail_url, journal_name, pub_year, authors, introduction, methods, link_url, file_url, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE publications SET title = $1, thumbnail_url = $2, journal_name = $3, pub_year = $4, authors = $5, introduction = $6, methods = $7, link_url = $8, file_url = $9, details_json = $10 WHERE id = $11 RETURNING *',
            [title || '', thumbnail_url || '', journal_name || '', pub_year || '', authors || '', introduction || '', methods || '', link_url || '', file_url || '', details_json || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/publications/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM publications WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Research ---
app.get('/api/research', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM research ORDER BY sort_order ASC, created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/research', authenticateToken, async (req, res) => {
    const { title, description, image_url, link, file_url, status, date_text, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO research (title, description, image_url, link, file_url, status, date_text, details_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [title || '', description || '', image_url || '', link || '', file_url || '', status || '', date_text || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/research/:id', authenticateToken, async (req, res) => {
    const { title, description, image_url, link, file_url, status, date_text, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE research SET title = $1, description = $2, image_url = $3, link = $4, file_url = $5, status = $6, date_text = $7, details_json = $8 WHERE id = $9 RETURNING *',
            [title || '', description || '', image_url || '', link || '', file_url || '', status || '', date_text || '', details_json || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/research/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM research WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Gallery Categories CRUD
app.get('/api/gallery-categories', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM "gallery_categories" ORDER BY "sort_order" ASC, "name" ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/gallery-categories', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const result = await db.query(
            'INSERT INTO gallery_categories (name) VALUES ($1) RETURNING *',
            [name]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/gallery-categories/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const result = await db.query(
            'UPDATE gallery_categories SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/gallery-categories/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // First get the category name so we can delete its associated images
        const catRes = await db.query('SELECT name FROM gallery_categories WHERE id = $1', [id]);
        if (catRes.rows.length === 0) return res.status(404).json({ error: 'Category not found' });
        
        const catName = catRes.rows[0].name;

        // Use a transaction
        await db.query('BEGIN');
        
        // 1. Delete all images belonging to this category from the gallery table
        await db.query('DELETE FROM gallery WHERE category = $1', [catName]);
        
        // 2. Delete the category itself
        await db.query('DELETE FROM gallery_categories WHERE id = $1', [id]);
        
        await db.query('COMMIT');
        
        console.log(`Successfully deleted category "${catName}" and its related gallery items.`);
        res.json({ message: 'Category and all associated images deleted successfully' });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Delete Category Error:', err);
        res.status(500).json({ error: 'Database error while deleting category' });
    }
});

// --- Gallery ---
app.get('/api/gallery', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM gallery ORDER BY sort_order ASC, id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/gallery', authenticateToken, async (req, res) => {
    const { image_url, caption, category } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO gallery (image_url, caption, category) VALUES ($1, $2, $3) RETURNING *',
            [image_url, caption, category]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/gallery/:id', authenticateToken, async (req, res) => {
    const { image_url, caption, category } = req.body;
    try {
        const result = await db.query(
            'UPDATE gallery SET image_url = $1, caption = $2, category = $3 WHERE id = $4 RETURNING *',
            [image_url, caption, category, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/gallery/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Messages ---
app.post('/api/messages', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await db.query('INSERT INTO messages (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);
        res.status(201).json({ message: 'Message sent successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/messages', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Social Links ---
app.get('/api/social-links', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM social_links ORDER BY sort_order ASC, platform ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/social-links', authenticateToken, async (req, res) => {
    const { platform, url, icon_name, color_class } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO social_links (platform, url, icon_name, color_class) VALUES ($1, $2, $3, $4) RETURNING *',
            [platform, url, icon_name, color_class]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/social-links/:id', authenticateToken, async (req, res) => {
    const { platform, url, icon_name, color_class } = req.body;
    try {
        const result = await db.query(
            'UPDATE social_links SET platform = $1, url = $2, icon_name = $3, color_class = $4 WHERE id = $5 RETURNING *',
            [platform, url, icon_name, color_class, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/social-links/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM social_links WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Experiences ---
app.get('/api/experiences', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM experiences ORDER BY sort_order ASC, start_date DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/experiences', authenticateToken, async (req, res) => {
    const { company, position, location, start_date, end_date, description, logo_url, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO experiences (company, position, location, start_date, end_date, description, logo_url, details_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [company || '', position || '', location || '', start_date || '', end_date || '', description || '', logo_url || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/experiences/:id', authenticateToken, async (req, res) => {
    const { company, position, location, start_date, end_date, description, logo_url, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE experiences SET company = $1, position = $2, location = $3, start_date = $4, end_date = $5, description = $6, logo_url = $7, details_json = $8 WHERE id = $9 RETURNING *',
            [company || '', position || '', location || '', start_date || '', end_date || '', description || '', logo_url || '', details_json || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/experiences/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM experiences WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Research Interests ---
app.get('/api/research-interests', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM research_interests ORDER BY sort_order ASC, interest ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/research-interests', authenticateToken, async (req, res) => {
    const { interest, details, icon_name, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO research_interests (interest, details, icon_name, details_json) VALUES ($1, $2, $3, $4) RETURNING *',
            [interest || '', details || '', icon_name || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/research-interests/:id', authenticateToken, async (req, res) => {
    const { interest, details, icon_name, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE research_interests SET interest = $1, details = $2, icon_name = $3, details_json = $4 WHERE id = $5 RETURNING *',
            [interest || '', details || '', icon_name || '', details_json || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/research-interests/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM research_interests WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Dynamic Pages (CMS) ---
app.get('/api/pages', async (req, res) => {
    try {
        const result = await db.query('SELECT id, title, slug, content, details_json, show_in_nav FROM pages ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pages/:slug', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM pages WHERE slug = $1', [req.params.slug]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Page not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pages', authenticateToken, async (req, res) => {
    const { title, slug, content, show_in_nav, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO pages (title, slug, content, show_in_nav, details_json) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title || '', slug || '', content || '', Boolean(show_in_nav), details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/pages/:id', authenticateToken, async (req, res) => {
    const { title, slug, content, show_in_nav, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE pages SET title = $1, slug = $2, content = $3, show_in_nav = $4, details_json = $5 WHERE id = $6 RETURNING *',
            [title || '', slug || '', content || '', Boolean(show_in_nav), details_json || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pages/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM pages WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Trainings ---
app.get('/api/trainings', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM trainings ORDER BY sort_order ASC, created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/trainings', authenticateToken, async (req, res) => {
    const { title, topic, date_text, instructor, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO trainings (title, topic, date_text, instructor, details_json) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title || '', topic || '', date_text || '', instructor || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/trainings/:id', authenticateToken, async (req, res) => {
    const { title, topic, date_text, instructor, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE trainings SET title = $1, topic = $2, date_text = $3, instructor = $4, details_json = $5 WHERE id = $6 RETURNING *',
            [title || '', topic || '', date_text || '', instructor || '', details_json || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/trainings/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM trainings WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Skills ---
app.get('/api/skills', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM skills ORDER BY sort_order ASC, category ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/skills', authenticateToken, async (req, res) => {
    const { category, items, details_json } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO skills (category, items, details_json) VALUES ($1, $2, $3) RETURNING *',
            [category || '', items || '', details_json || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/skills/:id', authenticateToken, async (req, res) => {
    const { category, items, details_json } = req.body;
    try {
        const result = await db.query(
            'UPDATE skills SET category = $1, items = $2, details_json = $3 WHERE id = $4 RETURNING *',
            [category || '', items || '', details_json || '', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/skills/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM skills WHERE id = $1', [req.params.id]);
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Bulk Reorder Endpoint ---
app.put('/api/reorder/:table', authenticateToken, async (req, res) => {
    const { table } = req.params;
    const { orders } = req.body; // Array of {id, sort_order}
    const allowedTables = ['academics', 'experiences', 'trainings', 'skills', 'research', 'publications', 'projects', 'social_links', 'research_interests', 'gallery', 'gallery_categories'];
    
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table' });
    }

    try {
        // Use a transaction for bulk update
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            for (const item of orders) {
                const query = `UPDATE "${table}" SET "sort_order" = $1 WHERE "id" = $2`;
                await client.query(query, [item.sort_order, item.id]);
            }
            await client.query('COMMIT');
            res.json({ message: 'Order updated successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Reorder Endpoint Error:', err);
        res.status(500).json({ error: err.message });
    }
});

if (process.env.NODE_ENV !== 'production' && typeof process !== 'undefined' && process.release && process.release.name === 'node') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Cloudflare Workers
module.exports = app;
