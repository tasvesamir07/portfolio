const { translateTexts } = require('../translate');

const LANGUAGE_HEADER = 'x-translate-language';
const SKIP_TRANSLATION_HEADER = 'x-skip-auto-translate';
const RESPONSE_TRANSLATED_HEADER = 'X-Response-Translated';
const RESPONSE_TRANSLATION_CACHE_VERSION = 'v4';

const MAX_RESPONSE_CACHE_ENTRIES = 2000;
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
    'custom_nav',
    'custom_sidebar_order'
]);

const HTML_REGEX = /<[a-z][\s\S]*>/i;
const URLISH_REGEX = /^(https?:\/\/|mailto:|tel:|data:|\/uploads\/)/i;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const NON_TRANSLATABLE_SYMBOLIC_REGEX = /^[\d\s.,:/()\-+%]+$/;
const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;

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
        if (keyLanguage !== language) return true;
    }
    if (URLISH_REGEX.test(value.trim())) return true;
    if (EMAIL_REGEX.test(value.trim())) return true;
    if (NON_TRANSLATABLE_SYMBOLIC_REGEX.test(value.trim())) return true;
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
    `${RESPONSE_TRANSLATION_CACHE_VERSION}::${language}::${req.originalUrl || req.path || ''}`;

const shouldServerTranslateResponse = (req, language = 'en') => {
    const normalizedLanguage = normalizeTargetLanguage(language);
    if (!['en', 'bn', 'ko'].includes(normalizedLanguage)) return false;
    if (req.headers?.[SKIP_TRANSLATION_HEADER] === '1') return false;
    return true;
};

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

const maybeTranslateApiPayload = async (req, res, payload, language = 'en') => {
    const normalizedLanguage = normalizeTargetLanguage(language);
    if (!shouldServerTranslateResponse(req, normalizedLanguage)) {
        return payload;
    }

    const cacheKey = buildResponseTranslationCacheKey(req, normalizedLanguage);
    if (responseTranslationCache.has(cacheKey)) {
        res.setHeader(RESPONSE_TRANSLATED_HEADER, '1');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Vary', 'Accept-Encoding, x-translate-language');
        return responseTranslationCache.get(cacheKey);
    }

    let timeoutId;
    try {
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Server translation timeout')), 1000);
        });

        const translated = await Promise.race([
            translateResponseData(payload, normalizedLanguage),
            timeoutPromise
        ]);
        clearTimeout(timeoutId);

        responseTranslationCache.set(cacheKey, translated);
        trimResponseTranslationCache();
        res.setHeader(RESPONSE_TRANSLATED_HEADER, '1');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Vary', 'Accept-Encoding, x-translate-language');
        return translated;
    } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        console.warn(`[Auto-Translate] Falling back to original data for ${req.originalUrl || req.path} (${normalizedLanguage}) due to: ${err.message}`);
        return payload;
    }
};

const localizeDataObject = (data, language = 'en') => {
    if (data == null || language === 'en') return data;

    if (Array.isArray(data)) {
        return data.map(item => localizeDataObject(item, language));
    }

    if (typeof data === 'object') {
        const result = { ...data };
        const suffix = `_${language}`;

        Object.keys(result).forEach(key => {
            if (key.endsWith(suffix)) {
                const baseKey = key.slice(0, -suffix.length);
                const localizedValue = result[key];
                
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

const hasNonEnglishText = (value) => {
    if (value == null) return false;
    if (typeof value === 'string') {
        return BANGLA_REGEX.test(value) || HANGUL_REGEX.test(value);
    }
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            if (hasNonEnglishText(value[i])) return true;
        }
        return false;
    }
    if (typeof value === 'object') {
        const values = Object.values(value);
        for (let i = 0; i < values.length; i++) {
            if (hasNonEnglishText(values[i])) return true;
        }
        return false;
    }
    return false;
};

const middleware = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (payload) => {
        const method = String(req.method || 'GET').toUpperCase();
        const fullPath = (req.originalUrl || '').split('?')[0];
        const isApiPath = fullPath.startsWith('/api/');
        const isTranslateEndpoint = fullPath === '/api/translate';

        if (method !== 'GET' || !isApiPath || isTranslateEndpoint) {
            return originalJson(payload);
        }

        // Skip if route handler already localized data (e.g., page-data, page routes)
        if (res.locals.dataLocalized) {
            return originalJson(payload);
        }

        const language = req.headers[LANGUAGE_HEADER] || 'en';
        const targetLang = normalizeTargetLanguage(language);
        if (targetLang === 'en') {
            return originalJson(payload);
        }

        return Promise.resolve(maybeTranslateApiPayload(req, res, payload, language))
            .then((translatedPayload) => originalJson(translatedPayload))
            .catch((err) => {
                console.warn(`[Auto-Translate] Error for ${fullPath}:`, err.message);
                return originalJson(payload);
            });
    };
    next();
};


const clearResponseCache = (resourcePrefix) => {
    if (!resourcePrefix) {
        responseTranslationCache.clear();
        return;
    }

    const prefixToMatch = `/api/v1/${resourcePrefix}`;
    const pageDataPrefix = `/api/v1/page-data`;
    for (const key of responseTranslationCache.keys()) {
        if (key.includes(prefixToMatch) || key.includes(pageDataPrefix)) {
            responseTranslationCache.delete(key);
        }
    }
};

module.exports = {
    middleware,
    localizeDataObject,
    clearResponseCache,
    translateResponseData,
    normalizeTargetLanguage,
    shouldServerTranslateResponse
};
