if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    require('dotenv').config();
}
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./db');
const authenticateToken = require('./auth');
const { upload, processFile, deleteManagedMediaFiles, MAX_UPLOAD_SIZE_MB } = require('./upload');
const path = require('path');
const { translateTexts } = require('./translate');

const app = express();
const PORT = process.env.PORT || 5000;
const LANGUAGE_HEADER = 'x-translate-language';
const SKIP_TRANSLATION_HEADER = 'x-skip-auto-translate';
const RESPONSE_TRANSLATED_HEADER = 'X-Response-Translated';
const RESPONSE_TRANSLATION_CACHE_VERSION = 'v3';
const cleanMediaUrls = async (urls = []) => {
    const failures = await deleteManagedMediaFiles(urls);
    if (failures.length) {
        console.warn('Managed media cleanup warnings:', failures.join(' | '));
    }
};

const diffRemovedMediaUrls = (previousUrls = [], nextUrls = []) => {
    const normalizedNextUrls = new Set((nextUrls || []).filter(Boolean));
    return [...new Set((previousUrls || []).filter((url) => url && !normalizedNextUrls.has(url)))];
};
const MAX_RESPONSE_CACHE_ENTRIES = 400;
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
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const NON_TRANSLATABLE_SYMBOLIC_REGEX = /^[\d\s.,:/()\-+%]+$/;
const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
const HTML_SEGMENT_JOIN_TOKEN = '\n[[__PORTFOLIO_HTML_SEGMENT_SPLIT__]]\n';
const HTML_SEGMENT_GROUP_CHAR_LIMIT = 9000;
const HTML_SEGMENT_GROUP_SIZE_LIMIT = 120;
const HTML_SEGMENT_MAX_SPLIT_DEPTH = 2;
const OTP_TTL_MINUTES = 5;

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

// Hard CORS headers for serverless environments (Vercel/Workers) so preflight never fails.
app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-translate-language, x-skip-auto-translate');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    next();
});

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-translate-language', 'x-skip-auto-translate']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Invalidate translated response cache on any mutation request.
app.use((req, res, next) => {
    const method = String(req.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        responseTranslationCache.clear();
    }
    next();
});

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

    const hasBangla = BANGLA_REGEX.test(trimmed);
    const hasHangul = HANGUL_REGEX.test(trimmed);
    const hasLatin = /[A-Za-z]/.test(trimmed);

    if (language === 'bn') {
        return hasBangla && !hasHangul && !hasLatin;
    }

    if (language === 'ko') {
        return hasHangul && !hasBangla && !hasLatin;
    }

    return !hasBangla && !hasHangul;
};

const shouldSkipStringTranslation = (key = '', value = '', language = 'en') => {
    if (!value || !value.trim()) return true;
    if (SKIP_TRANSLATION_KEYS.has(key) || key.endsWith('_url')) return true;
    const localizedSuffixMatch = key.match(/_(en|bn|ko)$/i);
    if (localizedSuffixMatch) {
        const keyLanguage = localizedSuffixMatch[1].toLowerCase();
        // Only skip localized fields that belong to other languages.
        // The active language field (e.g., content_en while language=en) must stay translatable
        // to recover from partially translated/stale CMS content.
        if (keyLanguage !== language) return true;
    }
    if (URLISH_REGEX.test(value.trim())) return true;
    if (EMAIL_REGEX.test(value.trim())) return true;
    if (NON_TRANSLATABLE_SYMBOLIC_REGEX.test(value.trim())) return true;
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

    const buildSegmentGroups = (values = []) => {
        const groups = [];
        let currentGroup = [];
        let currentChars = 0;

        values.forEach((value) => {
            const tokenCost = currentGroup.length ? HTML_SEGMENT_JOIN_TOKEN.length : 0;
            const nextChars = currentChars + tokenCost + value.length;

            if (
                currentGroup.length >= HTML_SEGMENT_GROUP_SIZE_LIMIT
                || nextChars > HTML_SEGMENT_GROUP_CHAR_LIMIT
            ) {
                if (currentGroup.length) {
                    groups.push(currentGroup);
                }
                currentGroup = [value];
                currentChars = value.length;
                return;
            }

            currentGroup.push(value);
            currentChars = nextChars;
        });

        if (currentGroup.length) {
            groups.push(currentGroup);
        }

        return groups;
    };

    const translateSegmentGroup = async (group = [], depth = 0) => {
        if (!group.length) return [];
        if (group.length === 1) {
            const [single] = await translateTexts(group, language);
            return [single || group[0]];
        }

        const joined = group.join(HTML_SEGMENT_JOIN_TOKEN);
        const [translatedJoined] = await translateTexts([joined], language);
        const normalizedJoined = String(joined).trim();
        const normalizedTranslatedJoined = String(translatedJoined || joined).trim();

        const parts = String(translatedJoined || joined).split(HTML_SEGMENT_JOIN_TOKEN);
        const unchangedWhileNeedsTranslation =
            normalizedTranslatedJoined === normalizedJoined
            && !isLikelyAlreadyInTargetLanguage(joined, language);
        const splitInvalid = parts.length !== group.length;

        if (!unchangedWhileNeedsTranslation && !splitInvalid) {
            return parts;
        }

        if (depth >= HTML_SEGMENT_MAX_SPLIT_DEPTH || group.length <= 2) {
            // Final fallback: translate each segment independently instead of returning originals.
            // This avoids leaving untranslated fragments when a grouped translation response is malformed.
            return Promise.all(group.map(async (segment) => {
                const [single] = await translateTexts([segment], language);
                return single || segment;
            }));
        }

        const middle = Math.ceil(group.length / 2);
        const left = await translateSegmentGroup(group.slice(0, middle), depth + 1);
        const right = await translateSegmentGroup(group.slice(middle), depth + 1);
        return [...left, ...right];
    };

    const segmentGroups = buildSegmentGroups(uniqueTexts);
    const translatedGroupResults = await Promise.all(segmentGroups.map((group) => translateSegmentGroup(group)));
    const translatedTexts = translatedGroupResults.flat();
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
    `${RESPONSE_TRANSLATION_CACHE_VERSION}::${language}::${req.originalUrl || req.path || ''}`;

const shouldServerTranslateResponse = (req, language = 'en') => {
    const normalizedLanguage = normalizeTargetLanguage(language);
    if (!['en', 'bn', 'ko'].includes(normalizedLanguage)) return false;
    if (req.headers?.[SKIP_TRANSLATION_HEADER] === '1') return false;
    return true;
};

const maybeTranslateApiPayload = async (req, res, payload, language = 'en') => {
    const normalizedLanguage = normalizeTargetLanguage(language);
    if (!shouldServerTranslateResponse(req, normalizedLanguage)) {
        return payload;
    }

    const cacheKey = buildResponseTranslationCacheKey(req, normalizedLanguage);
    if (responseTranslationCache.has(cacheKey)) {
        res.setHeader(RESPONSE_TRANSLATED_HEADER, '1');
        return responseTranslationCache.get(cacheKey);
    }

    const translated = await translateResponseData(payload, normalizedLanguage);
    responseTranslationCache.set(cacheKey, translated);
    trimResponseTranslationCache();
    res.setHeader(RESPONSE_TRANSLATED_HEADER, '1');
    return translated;
};

// Global response translator for public GET API responses.
// This keeps translation centralized on the server and allows shared caching.
app.use((req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
        const method = String(req.method || 'GET').toUpperCase();
        const isApiPath = String(req.path || '').startsWith('/api/');
        const isTranslateEndpoint = req.path === '/api/translate';

        if (method !== 'GET' || !isApiPath || isTranslateEndpoint) {
            return originalJson(payload);
        }

        const language = req.headers[LANGUAGE_HEADER] || 'en';
        return Promise.resolve(maybeTranslateApiPayload(req, res, payload, language))
            .then((translatedPayload) => originalJson(translatedPayload))
            .catch((error) => {
                console.error('Server-side response translation failed:', error?.message || error);
                return originalJson(payload);
            });
    };

    next();
});

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

};

/**
 * Recursively localizes a data object by looking for field_language suffixes.
 * If language is 'bn' and name_bn exists and has a value, it replaces 'name' with 'name_bn'.
 */
const localizeDataObject = (data, language = 'en') => {
    if (data == null || language === 'en') return data;

    if (Array.isArray(data)) {
        return data.map(item => localizeDataObject(item, language));
    }

    if (typeof data === 'object') {
        const result = { ...data };
        const suffix = `_${language}`;

        Object.keys(result).forEach(key => {
            // If we find a key with the language suffix (e.g., bio_text_bn)
            if (key.endsWith(suffix)) {
                const baseKey = key.slice(0, -suffix.length);
                const localizedValue = result[key];
                
                // If the localized value is non-empty, prioritize it for the base key
                if (localizedValue && typeof localizedValue === 'string' && localizedValue.trim()) {
                    result[baseKey] = localizedValue;
                }
            } else if (typeof result[key] === 'object') {
                result[key] = localizeDataObject(result[key], language);
            }
        });

        return result;
    }

    return data;
};

// Translation interceptor deferred natively to client-side localStorage caching mechanisms instead.

let otpMailer;

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const normalizeUsername = (value = '') => String(value || '').trim();
const normalizeIdentifier = (value = '') => String(value || '').trim();

const createOtpHash = (otp = '') => (
    crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'fallback-otp-secret-change-me')
        .update(String(otp))
        .digest('hex')
);

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const sanitizeUser = (user = {}) => ({
    id: user.id,
    username: user.username || '',
    email: user.email || ''
});

const buildAuthToken = (user = {}) => jwt.sign(
    {
        id: user.id,
        username: user.username,
        email: user.email || ''
    },
    process.env.JWT_SECRET || 'fallback-secret-change-me',
    { expiresIn: '1h' }
);

const getOtpMailer = () => {
    if (otpMailer) return otpMailer;

    const service = process.env.PURCHASE_EMAIL_SERVICE || 'gmail';
    const user = process.env.PURCHASE_EMAIL_USER;
    const pass = process.env.PURCHASE_EMAIL_PASS;

    if (!user || !pass) {
        throw new Error('OTP email sender is not configured. Set PURCHASE_EMAIL_USER and PURCHASE_EMAIL_PASS.');
    }

    otpMailer = nodemailer.createTransport({
        service,
        auth: { user, pass }
    });

    return otpMailer;
};

const sendOtpEmail = async ({ to, username, otp, subject, title, body }) => {
    const transporter = getOtpMailer();
    const sender = process.env.PURCHASE_EMAIL_USER;

    const defaultSubject = 'Your Admin Profile OTP Code';
    const defaultTitle = 'Admin Profile Verification';
    const defaultBody = 'Use this OTP to confirm your request:';

    await transporter.sendMail({
        from: sender,
        to,
        subject: subject || defaultSubject,
        text: `Hello ${username || 'Admin'}, your OTP code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes. If you request a new code, the previous one stops working immediately.`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
                <h2 style="margin: 0 0 12px;">${title || defaultTitle}</h2>
                <p style="margin: 0 0 12px;">Hello ${username || 'Admin'},</p>
                <p style="margin: 0 0 12px;">${body || defaultBody}</p>
                <div style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0b3b75; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 6px;">
                    ${otp}
                </div>
                <p style="margin: 16px 0 0;">This code expires in ${OTP_TTL_MINUTES} minutes. If you request a new code, the previous code stops working immediately.</p>
            </div>
        `
    });
};

const getUserById = async (id) => {
    const result = await db.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] || null;
};

const clearPendingProfileUpdate = async (userId) => {
    await db.query(
        `UPDATE users
         SET otp_hash = NULL,
             otp_expires_at = NULL,
             pending_username = NULL,
             pending_email = NULL,
             pending_password_hash = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
    );
};

const ensureCmsTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(255),
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

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
    // Schema is managed via schema.sql. Redundant ALTER TABLE statements removed.
    const userCountResult = await db.query('SELECT COUNT(*)::int AS count FROM users');
    const userCount = userCountResult.rows[0]?.count || 0;

    if (!userCount) {
        console.log('No users found in DB. Seeding default admin user...');
        const passwordHash = await bcrypt.hash('admin', 10);
        await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
            ['admin', '', passwordHash]
        );
        console.log("Default user 'admin' created with password 'admin'");
    } else {
        console.log(`Database already has ${userCount} users.`);
    }
};

ensureCmsTables().catch((err) => {
    console.error('Failed to ensure CMS tables:', err);
});

// --- Health/Ping ---
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

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
    const identifier = normalizeIdentifier(req.body?.identifier || req.body?.username || req.body?.email);
    const password = String(req.body?.password || '');

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Username or email and password are required.' });
    }

    try {
        const result = await db.query(
            'SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(COALESCE(email, \'\')) = LOWER($1) LIMIT 1',
            [identifier]
        );
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            if (!process.env.JWT_SECRET) {
                console.error('JWT_SECRET is not defined in environment variables');
            }
            const token = buildAuthToken(user);
            res.json({
                token,
                user: sanitizeUser(user)
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: err.message });
    }
};

app.post('/api/admin-login', loginHandler);

app.post('/api/auth/forgot-password', async (req, res) => {
    const email = normalizeEmail(req.body?.email || '');
    if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
        if (result.rows.length === 0) {
            // Security: Don't leak if email exists, but here we can be helpful for admin
            return res.status(404).json({ message: 'No admin account found with that email.' });
        }

        const user = result.rows[0];
        const otp = generateOtpCode();
        const otpHash = createOtpHash(otp);

        await db.query(
            `UPDATE users
             SET otp_hash = $1,
                 otp_expires_at = NOW() + INTERVAL '5 minutes',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [otpHash, user.id]
        );

        await sendOtpEmail({
            to: email,
            username: user.username,
            otp,
            subject: 'Password Reset OTP Code',
            title: 'Password Reset Verification',
            body: 'Use this OTP to verify your password reset request:'
        });

        res.json({ message: `A 6-digit OTP was sent to ${email}.` });
    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ message: 'Failed to send OTP.' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const email = normalizeEmail(req.body?.email || '');
    const otp = String(req.body?.otp || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });

        const user = result.rows[0];

        if (!user.otp_hash || !user.otp_expires_at) {
            return res.status(400).json({ message: 'No pending reset request found.' });
        }

        if (new Date(user.otp_expires_at).getTime() < Date.now()) {
            return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
        }

        if (createOtpHash(otp) !== user.otp_hash) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await db.query(
            `UPDATE users
             SET password_hash = $1,
                 otp_hash = NULL,
                 otp_expires_at = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [newPasswordHash, user.id]
        );

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ message: 'Failed to reset password.' });
    }
});
app.get('/api/session', authenticateToken, (req, res) => {
    res.json({
        authenticated: true,
        user: {
            id: req.user?.id,
            username: req.user?.username,
            email: req.user?.email || ''
        }
    });
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User account not found.' });
        }

        res.json(sanitizeUser(user));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/profile/request-otp', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User account not found.' });
        }

        const nextUsername = normalizeUsername(req.body?.username || user.username);
        const nextEmail = normalizeEmail(req.body?.email || '');
        const nextPassword = String(req.body?.password || '');

        if (!nextUsername) {
            return res.status(400).json({ message: 'Username is required.' });
        }

        if (nextEmail && !EMAIL_REGEX.test(nextEmail)) {
            return res.status(400).json({ message: 'Enter a valid email address.' });
        }

        if (nextPassword && nextPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        const normalizedCurrentEmail = normalizeEmail(user.email || '');
        const hasUsernameChange = nextUsername !== user.username;
        const hasEmailChange = nextEmail !== normalizedCurrentEmail;
        const hasPasswordChange = Boolean(nextPassword);

        if (!hasUsernameChange && !hasEmailChange && !hasPasswordChange) {
            return res.status(400).json({ message: 'Change at least one field before requesting an OTP.' });
        }

        const usernameConflict = await db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1',
            [nextUsername, user.id]
        );
        if (usernameConflict.rows.length) {
            return res.status(409).json({ message: 'That username is already in use.' });
        }

        if (nextEmail) {
            const emailConflict = await db.query(
                'SELECT id FROM users WHERE LOWER(COALESCE(email, \'\')) = LOWER($1) AND id <> $2 LIMIT 1',
                [nextEmail, user.id]
            );
            if (emailConflict.rows.length) {
                return res.status(409).json({ message: 'That email is already in use.' });
            }
        }

        const recipientEmail = normalizedCurrentEmail || nextEmail;
        if (!recipientEmail) {
            return res.status(400).json({ message: 'Set an email address before requesting an OTP.' });
        }

        const otp = generateOtpCode();
        const otpHash = createOtpHash(otp);
        const pendingPasswordHash = nextPassword ? await bcrypt.hash(nextPassword, 10) : null;

        await db.query(
            `UPDATE users
             SET otp_hash = $1,
                 otp_expires_at = NOW() + INTERVAL '5 minutes',
                 pending_username = $2,
                 pending_email = $3,
                 pending_password_hash = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [otpHash, nextUsername, nextEmail, pendingPasswordHash, user.id]
        );

        await sendOtpEmail({
            to: recipientEmail,
            username: user.username,
            otp
        });

        res.json({
            message: `A 6-digit OTP was sent to ${recipientEmail}. It expires in ${OTP_TTL_MINUTES} minutes.`,
            recipientEmail
        });
    } catch (err) {
        console.error('Profile OTP request failed:', err);
        res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }
});

app.post('/api/profile/confirm-update', authenticateToken, async (req, res) => {
    try {
        const otp = String(req.body?.otp || '').trim();
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({ message: 'Enter a valid 6-digit OTP.' });
        }

        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User account not found.' });
        }

        if (!user.otp_hash || !user.otp_expires_at) {
            return res.status(400).json({ message: 'No pending OTP request found. Request a new OTP first.' });
        }

        if (new Date(user.otp_expires_at).getTime() < Date.now()) {
            await clearPendingProfileUpdate(user.id);
            return res.status(400).json({ message: 'OTP expired. Request a new one.' });
        }

        if (createOtpHash(otp) !== user.otp_hash) {
            return res.status(400).json({ message: 'Invalid OTP. Request a new code if needed.' });
        }

        const nextUsername = normalizeUsername(user.pending_username || user.username);
        const nextEmail = normalizeEmail(user.pending_email || '');
        const nextPasswordHash = user.pending_password_hash || user.password_hash;

        const usernameConflict = await db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1',
            [nextUsername, user.id]
        );
        if (usernameConflict.rows.length) {
            return res.status(409).json({ message: 'That username is already in use.' });
        }

        if (nextEmail) {
            const emailConflict = await db.query(
                'SELECT id FROM users WHERE LOWER(COALESCE(email, \'\')) = LOWER($1) AND id <> $2 LIMIT 1',
                [nextEmail, user.id]
            );
            if (emailConflict.rows.length) {
                return res.status(409).json({ message: 'That email is already in use.' });
            }
        }

        const updateResult = await db.query(
            `UPDATE users
             SET username = $1,
                 email = $2,
                 password_hash = $3,
                 otp_hash = NULL,
                 otp_expires_at = NULL,
                 pending_username = NULL,
                 pending_email = NULL,
                 pending_password_hash = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [nextUsername, nextEmail, nextPasswordHash, user.id]
        );

        const updatedUser = updateResult.rows[0];
        const token = buildAuthToken(updatedUser);

        res.json({
            message: 'Profile updated successfully.',
            token,
            user: sanitizeUser(updatedUser)
        });
    } catch (err) {
        console.error('Profile OTP confirm failed:', err);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
});

// --- Upload ---
app.post('/api/upload', authenticateToken, (req, res) => {
    upload.single('file')(req, res, async (uploadErr) => {
        if (uploadErr) {
            if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: `File is too large. Maximum upload size is ${MAX_UPLOAD_SIZE_MB} MB.` });
            }

            return res.status(400).json({ error: uploadErr.message || 'Upload failed.' });
        }

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
});

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'portfolio-api',
        message: 'API is running. Use /api/* endpoints.'
    });
});


// --- About ---
app.get('/api/about', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM about LIMIT 1');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows[0], language));
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
        const previousResult = await db.query('SELECT resume_url, hero_image_url, logo_url FROM about LIMIT 1');
        const previousAbout = previousResult.rows[0] || {};
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
        await cleanMediaUrls(diffRemovedMediaUrls(
            [previousAbout.resume_url, previousAbout.hero_image_url, previousAbout.logo_url],
            [resume_url || '', hero_image_url || '', logo_url || '']
        ));
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Academics ---
app.get('/api/academics', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM academics ORDER BY sort_order ASC, start_year DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
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
        const previousResult = await db.query('SELECT logo_url FROM academics WHERE id = $1', [req.params.id]);
        const previousRow = previousResult.rows[0] || {};
        const result = await db.query(
            'UPDATE academics SET institution = $1, degree = $2, start_year = $3, end_year = $4, logo_url = $5, details_json = $6 WHERE id = $7 RETURNING *',
            [institution || '', degree || '', start_year || '', end_year || '', logo_url || '', details_json || '', req.params.id]
        );
        await cleanMediaUrls(diffRemovedMediaUrls([previousRow.logo_url], [logo_url || '']));
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/academics/:id', authenticateToken, async (req, res) => {
    try {
        const previousResult = await db.query('SELECT logo_url FROM academics WHERE id = $1', [req.params.id]);
        await db.query('DELETE FROM academics WHERE id = $1', [req.params.id]);
        await cleanMediaUrls(previousResult.rows.map((row) => row.logo_url));
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Publications ---
app.get('/api/publications', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM publications ORDER BY sort_order ASC, pub_year DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
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
        const previousResult = await db.query('SELECT thumbnail_url, file_url FROM publications WHERE id = $1', [req.params.id]);
        const previousRow = previousResult.rows[0] || {};
        const result = await db.query(
            'UPDATE publications SET title = $1, thumbnail_url = $2, journal_name = $3, pub_year = $4, authors = $5, introduction = $6, methods = $7, link_url = $8, file_url = $9, details_json = $10 WHERE id = $11 RETURNING *',
            [title || '', thumbnail_url || '', journal_name || '', pub_year || '', authors || '', introduction || '', methods || '', link_url || '', file_url || '', details_json || '', req.params.id]
        );
        await cleanMediaUrls(diffRemovedMediaUrls(
            [previousRow.thumbnail_url, previousRow.file_url],
            [thumbnail_url || '', file_url || '']
        ));
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/publications/:id', authenticateToken, async (req, res) => {
    try {
        const previousResult = await db.query('SELECT thumbnail_url, file_url FROM publications WHERE id = $1', [req.params.id]);
        await db.query('DELETE FROM publications WHERE id = $1', [req.params.id]);
        await cleanMediaUrls(previousResult.rows.flatMap((row) => [row.thumbnail_url, row.file_url]));
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Research ---
app.get('/api/research', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM research ORDER BY sort_order ASC, created_at DESC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
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
        const previousResult = await db.query('SELECT image_url, file_url FROM research WHERE id = $1', [req.params.id]);
        const previousRow = previousResult.rows[0] || {};
        const result = await db.query(
            'UPDATE research SET title = $1, description = $2, image_url = $3, link = $4, file_url = $5, status = $6, date_text = $7, details_json = $8 WHERE id = $9 RETURNING *',
            [title || '', description || '', image_url || '', link || '', file_url || '', status || '', date_text || '', details_json || '', req.params.id]
        );
        await cleanMediaUrls(diffRemovedMediaUrls(
            [previousRow.image_url, previousRow.file_url],
            [image_url || '', file_url || '']
        ));
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/research/:id', authenticateToken, async (req, res) => {
    try {
        const previousResult = await db.query('SELECT image_url, file_url FROM research WHERE id = $1', [req.params.id]);
        await db.query('DELETE FROM research WHERE id = $1', [req.params.id]);
        await cleanMediaUrls(previousResult.rows.flatMap((row) => [row.image_url, row.file_url]));
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
        const galleryRows = await db.query('SELECT image_url FROM gallery WHERE category = $1', [catName]);

        // Use a transaction
        await db.query('BEGIN');
        
        // 1. Delete all images belonging to this category from the gallery table
        await db.query('DELETE FROM gallery WHERE category = $1', [catName]);
        
        // 2. Delete the category itself
        await db.query('DELETE FROM gallery_categories WHERE id = $1', [id]);
        
        await db.query('COMMIT');
        await cleanMediaUrls(galleryRows.rows.map((row) => row.image_url));
        
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
        const previousResult = await db.query('SELECT image_url FROM gallery WHERE id = $1', [req.params.id]);
        const previousRow = previousResult.rows[0] || {};
        const result = await db.query(
            'UPDATE gallery SET image_url = $1, caption = $2, category = $3 WHERE id = $4 RETURNING *',
            [image_url, caption, category, req.params.id]
        );
        await cleanMediaUrls(diffRemovedMediaUrls([previousRow.image_url], [image_url || '']));
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/gallery/:id', authenticateToken, async (req, res) => {
    try {
        const previousResult = await db.query('SELECT image_url FROM gallery WHERE id = $1', [req.params.id]);
        await db.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
        await cleanMediaUrls(previousResult.rows.map((row) => row.image_url));
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
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
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
        const previousResult = await db.query('SELECT logo_url FROM experiences WHERE id = $1', [req.params.id]);
        const previousRow = previousResult.rows[0] || {};
        const result = await db.query(
            'UPDATE experiences SET company = $1, position = $2, location = $3, start_date = $4, end_date = $5, description = $6, logo_url = $7, details_json = $8 WHERE id = $9 RETURNING *',
            [company || '', position || '', location || '', start_date || '', end_date || '', description || '', logo_url || '', details_json || '', req.params.id]
        );
        await cleanMediaUrls(diffRemovedMediaUrls([previousRow.logo_url], [logo_url || '']));
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/experiences/:id', authenticateToken, async (req, res) => {
    try {
        const previousResult = await db.query('SELECT logo_url FROM experiences WHERE id = $1', [req.params.id]);
        await db.query('DELETE FROM experiences WHERE id = $1', [req.params.id]);
        await cleanMediaUrls(previousResult.rows.map((row) => row.logo_url));
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Research Interests ---
app.get('/api/research-interests', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM research_interests ORDER BY sort_order ASC, interest ASC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
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
        const includeContent = String(req.query?.includeContent || '') === '1';
        const result = includeContent
            ? await db.query('SELECT id, title, slug, content, details_json, show_in_nav FROM pages ORDER BY id ASC')
            : await db.query('SELECT id, title, slug, show_in_nav FROM pages ORDER BY id ASC');
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Vercel-safe single-segment endpoint for fetching page by slug/id.
app.get('/api/page', async (req, res) => {
    try {
        const slug = String(req.query?.slug || '').trim();
        const id = Number(req.query?.id);
        let result;

        if (slug) {
            result = await db.query('SELECT * FROM pages WHERE slug = $1', [slug]);
        } else if (Number.isFinite(id) && id > 0) {
            result = await db.query('SELECT * FROM pages WHERE id = $1', [id]);
        } else {
            return res.status(400).json({ message: 'slug or id is required' });
        }

        if (result.rows.length === 0) return res.status(404).json({ message: 'Page not found' });
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows[0], language));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pages/:slug', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM pages WHERE slug = $1', [req.params.slug]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Page not found' });
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows[0], language));
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
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
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
        const language = req.headers[LANGUAGE_HEADER] || 'en';
        res.json(localizeDataObject(result.rows, language));
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
    const allowedTables = ['academics', 'experiences', 'trainings', 'skills', 'research', 'publications', 'social_links', 'research_interests', 'gallery', 'gallery_categories'];
    
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
