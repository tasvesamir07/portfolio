const fs = require('fs');
const path = require('path');
const { Redis } = require('@upstash/redis');

let redis = null;
if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    try {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_URL,
            token: process.env.UPSTASH_REDIS_TOKEN
        });
        console.log('[Auto-Translate] Upstash Redis client initialized successfully.');
    } catch (e) {
        console.error('[Auto-Translate] Failed to initialize Upstash Redis:', e.message);
    }
} else {
    console.warn('[Auto-Translate] Upstash Redis credentials not set. Falling back to local/memory cache.');
}

let translator = null;
const translationCache = new Map();
const MAX_CACHE_ENTRIES = 6000;
const CHUNK_CONCURRENCY = 8;
const CACHE_VERSION = 'v5';
const GOOGLE_TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
const LATIN_REGEX = /[A-Za-z]/;
const MAX_RETRY_CHUNK_CHARS = 220;

const CACHE_FILE = path.join(__dirname, '.translation-cache.json');

// On startup, load cache from disk if Redis is not used
if (!redis) {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const rawData = fs.readFileSync(CACHE_FILE, 'utf-8');
            const parsed = JSON.parse(rawData);
            Object.entries(parsed).forEach(([k, v]) => {
                if (typeof v === 'string') {
                    translationCache.set(k, v);
                }
            });
            console.log(`[Auto-Translate] Loaded ${translationCache.size} persistent cache entries from disk.`);
        }
    } catch (e) {
        console.warn('[Auto-Translate] Failed to load persistent translation cache:', e.message);
    }
}

// Debounce helper to prevent excessive disk writes
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const saveCacheToDisk = debounce(() => {
    if (redis) return;
    try {
        const obj = Object.fromEntries(translationCache);
        fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
        console.warn('[Auto-Translate] Failed to save translation cache to disk:', e.message);
    }
}, 5000);

/**
 * Decodes common HTML entities that might be returned by the translation service.
 */
const decodeHtmlEntities = (text = '') => {
    if (typeof text !== 'string' || !text.includes('&')) return text;
    
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#039;/g, "'")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&lsquo;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
};

/**
 * Lazy-load the ESM 'translate' package.
 */
const getTranslator = async () => {
    if (!translator) {
        // Dynamic import is required because 'translate' is an ESM-only package
        // and this project is currently CommonJS.
        const { default: translate } = await import('translate');
        translate.engine = 'google';
        translator = translate;
    }
    return translator;
};

const normalizeTargetLanguage = (language = 'en') => {
    if (language === 'bn') return 'bn';
    if (language === 'ko') return 'ko';
    return 'en';
};

const detectSourceLanguage = (text = '', targetLanguage = 'en') => {
    const sample = String(text || '');
    if (BANGLA_REGEX.test(sample)) return 'bn';
    if (HANGUL_REGEX.test(sample)) return 'ko';
    return targetLanguage === 'en' ? 'en' : 'en';
};

const needsTranslationForTarget = (text = '', targetLanguage = 'en') => {
    const sample = String(text || '');
    if (!sample.trim()) return false;

    const hasBangla = BANGLA_REGEX.test(sample);
    const hasHangul = HANGUL_REGEX.test(sample);
    const hasLatin = LATIN_REGEX.test(sample);

    if (targetLanguage === 'en') return hasBangla || hasHangul;
    if (targetLanguage === 'bn') return hasHangul || hasLatin;
    if (targetLanguage === 'ko') return hasBangla || hasLatin;
    return false;
};

const chunkTextByLength = (text = '', maxChars = MAX_RETRY_CHUNK_CHARS) => {
    const source = String(text || '');
    if (!source.trim() || source.length <= maxChars) {
        return [source];
    }

    const tokens = source.split(/(\s+)/).filter((token) => token !== '');
    const chunks = [];
    let current = '';

    tokens.forEach((token) => {
        if ((current + token).length > maxChars && current.trim()) {
            chunks.push(current);
            current = token;
            return;
        }

        current += token;
    });

    if (current) {
        chunks.push(current);
    }

    return chunks.length ? chunks : [source];
};

const splitForRetry = (text = '') => {
    const normalized = String(text || '');
    const parts = normalized
        .split(/(\r?\n+|(?<=[.!?\u0964])\s+)/)
        .filter((part) => part != null && part !== '');

    if (parts.length > 1) {
        return parts;
    }

    const clauseParts = normalized
        .split(/(?<=[,;:])(\s+)/)
        .filter((part) => part != null && part !== '');

    if (clauseParts.length > 1) {
        return clauseParts;
    }

    return chunkTextByLength(normalized);
};

const looksLikeBrokenTranslation = (translated = '', original = '', targetLanguage = 'en') => {
    const normalized = String(translated || '').trim();
    const originalTrimmed = String(original || '').trim();
    if (!normalized) return true;
    if (/^\?+(?:\s+\?+)*$/.test(normalized)) return true;
    if (normalized === originalTrimmed && needsTranslationForTarget(originalTrimmed, targetLanguage)) {
        return true;
    }

    if (targetLanguage === 'en' && (BANGLA_REGEX.test(normalized) || HANGUL_REGEX.test(normalized))) {
        return true;
    }

    if (targetLanguage === 'bn' && HANGUL_REGEX.test(originalTrimmed) && HANGUL_REGEX.test(normalized)) {
        return true;
    }

    if (targetLanguage === 'ko' && BANGLA_REGEX.test(originalTrimmed) && BANGLA_REGEX.test(normalized)) {
        return true;
    }

    return false;
};

const translateViaGoogleEndpoint = async (text = '', sourceLanguage = 'auto', targetLanguage = 'en') => {
    const params = new URLSearchParams({
        client: 'gtx',
        sl: sourceLanguage || 'auto',
        tl: targetLanguage,
        dt: 't',
        q: text
    });

    const response = await fetch(`${GOOGLE_TRANSLATE_ENDPOINT}?${params.toString()}`, {
        headers: {
            'Accept': 'application/json, text/plain, */*'
        }
    });

    if (!response.ok) {
        throw new Error(`Google translate endpoint failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload?.[0])) {
        throw new Error('Unexpected translate payload shape');
    }

    return payload[0]
        .map((part) => (Array.isArray(part) ? String(part[0] || '') : ''))
        .join('')
        .trim();
};

const translateWithFallbacks = async (text = '', sourceLanguage = 'auto', targetLanguage = 'en') => {
    try {
        const translated = await translateViaGoogleEndpoint(text, sourceLanguage, targetLanguage);
        if (!looksLikeBrokenTranslation(translated, text, targetLanguage)) {
            return translated;
        }
    } catch (error) {
        console.warn('Google endpoint translation failed:', error.message);
    }

    const translate = await getTranslator();
    const translated = await translate(text, { from: sourceLanguage, to: targetLanguage });
    return translated || text;
};

const getCacheKey = (text = '', targetLanguage = 'en', sourceLanguage = 'en') =>
    `${CACHE_VERSION}::${sourceLanguage}::${normalizeTargetLanguage(targetLanguage)}::${text}`;

const trimCache = () => {
    while (translationCache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = translationCache.keys().next().value;
        if (!oldestKey) break;
        translationCache.delete(oldestKey);
    }
};

const readCachedTranslation = async (text = '', targetLanguage = 'en', sourceLanguage = 'en') => {
    const key = getCacheKey(text, targetLanguage, sourceLanguage);
    
    // 1. Check L1 in-memory Map
    if (translationCache.has(key)) {
        const value = translationCache.get(key);
        // Refresh insertion order for basic LRU behavior.
        translationCache.delete(key);
        translationCache.set(key, value);
        return value;
    }

    // 2. Check L2 Redis Cache
    if (redis) {
        try {
            const value = await redis.get(key);
            if (value) {
                // Populate L1 cache
                translationCache.set(key, value);
                trimCache();
                return value;
            }
        } catch (e) {
            console.warn('[Auto-Translate] Redis get failed:', e.message);
        }
    }

    return null;
};

const writeCachedTranslation = async (text = '', targetLanguage = 'en', sourceLanguage = 'en', translated = '') => {
    const key = getCacheKey(text, targetLanguage, sourceLanguage);
    
    // 1. Write to L1 in-memory Map
    translationCache.set(key, translated);
    trimCache();
    if (!redis) {
        saveCacheToDisk();
    }

    // 2. Write to L2 Redis Cache
    if (redis) {
        try {
            // Set with 7-day TTL (7 * 24 * 3600 = 604800 seconds)
            await redis.set(key, translated, { ex: 604800 });
        } catch (e) {
            console.warn('[Auto-Translate] Redis set failed:', e.message);
        }
    }
};

/**
 * Concurrency control pool helper to process items in parallel up to limit.
 */
const processWithConcurrency = async (items, concurrency, processor) => {
    const limit = Math.max(1, concurrency);
    const results = new Array(items.length);
    let nextIndex = 0;

    const workers = Array.from({ length: limit }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++;
            results[currentIndex] = await processor(items[currentIndex], currentIndex);
        }
    });

    await Promise.all(workers);
    return results;
};

/**
 * Single-string translation proxy. 
 * Now uses the 'translate' package for more robust processing.
 */
const translateText = async (text = '', language = 'en') => {
    const targetLanguage = normalizeTargetLanguage(language);
    const sourceLanguage = detectSourceLanguage(text, targetLanguage);
    
    if (!text || !text.trim()) {
        return text;
    }

    if (!needsTranslationForTarget(text, targetLanguage) || sourceLanguage === targetLanguage) {
        return text;
    }

    const cached = await readCachedTranslation(text, targetLanguage, sourceLanguage);
    if (cached != null) {
        return cached;
    }

    try {
        const fragments = splitForRetry(text);
        if (fragments.length > 1 && (String(text).includes('\n') || String(text).length > 280)) {
            const translatedFragments = await processWithConcurrency(
                fragments,
                CHUNK_CONCURRENCY,
                (fragment) => translateText(fragment, language)
            );
            const resolved = translatedFragments.join('');

            if (!looksLikeBrokenTranslation(resolved, text, targetLanguage)) {
                await writeCachedTranslation(text, targetLanguage, sourceLanguage, resolved);
                return resolved;
            }
        }

        const translated = await translateWithFallbacks(text, sourceLanguage, targetLanguage);
        let resolved = translated || text;

        // Retry in smaller pieces when long mixed content comes back mostly unchanged.
        if (
            looksLikeBrokenTranslation(resolved, text, targetLanguage)
            && (String(text).includes('\n') || String(text).length > 220)
        ) {
            if (fragments.length > 1) {
                const translatedFragments = await processWithConcurrency(
                    fragments,
                    CHUNK_CONCURRENCY,
                    async (fragment) => {
                        if (!fragment.trim() || !needsTranslationForTarget(fragment, targetLanguage)) {
                            return fragment;
                        }

                        const fragmentSourceLanguage = detectSourceLanguage(fragment, targetLanguage);
                        if (fragmentSourceLanguage === targetLanguage) {
                            return fragment;
                        }

                        try {
                            const piece = await translateWithFallbacks(fragment, fragmentSourceLanguage, targetLanguage);
                            return piece || fragment;
                        } catch {
                            return fragment;
                        }
                    }
                );

                resolved = translatedFragments.join('');
            }
        }

        if (!looksLikeBrokenTranslation(resolved, text, targetLanguage)) {
            await writeCachedTranslation(text, targetLanguage, sourceLanguage, resolved);
        }

        return decodeHtmlEntities(resolved);
    } catch (error) {
        console.error(`Translation proxy failed:`, error.message);
        return text;
    }
};

/**
 * Batch translation proxy.
 * Processes small batches incoming from the frontend with chunked concurrency.
 */
const translateTexts = async (texts = [], language = 'en') => {
    if (!texts || texts.length === 0) return [];

    const normalizedTexts = texts.map((text) => String(text || ''));
    const uniqueTexts = [...new Set(normalizedTexts)];
    
    const unresolved = [];
    await Promise.all(uniqueTexts.map(async (text) => {
        const targetLanguage = normalizeTargetLanguage(language);
        if (!needsTranslationForTarget(text, targetLanguage)) return;
        const sourceLanguage = detectSourceLanguage(text, targetLanguage);
        if (sourceLanguage === targetLanguage) return;
        const cached = await readCachedTranslation(text, targetLanguage, sourceLanguage);
        if (cached == null) {
            unresolved.push(text);
        }
    }));

    if (unresolved.length > 0) {
        await processWithConcurrency(
            unresolved,
            CHUNK_CONCURRENCY,
            (text) => translateText(text, language)
        );
    }

    return Promise.all(normalizedTexts.map(async (text) => {
        const targetLanguage = normalizeTargetLanguage(language);
        if (!needsTranslationForTarget(text, targetLanguage)) return text;
        const sourceLanguage = detectSourceLanguage(text, targetLanguage);
        if (sourceLanguage === targetLanguage) return text;
        const cached = await readCachedTranslation(text, targetLanguage, sourceLanguage);
        return decodeHtmlEntities(cached != null ? cached : text);
    }));
};

const getAllCachedTranslations = async () => {
    const items = [];
    if (redis) {
        try {
            const keys = await redis.keys('v5::*');
            if (keys && keys.length > 0) {
                for (let i = 0; i < keys.length; i += 100) {
                    const chunkKeys = keys.slice(i, i + 100);
                    const values = await Promise.all(chunkKeys.map(k => redis.get(k)));
                    chunkKeys.forEach((key, idx) => {
                        if (values[idx]) {
                            items.push({ key, value: values[idx] });
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('[Auto-Translate] Redis keys/get failed in getAllCachedTranslations:', e.message);
        }
    }
    
    const mapEntries = Array.from(translationCache.entries());
    mapEntries.forEach(([key, value]) => {
        if (!items.find(item => item.key === key)) {
            items.push({ key, value });
        }
    });
    
    return items.map(item => {
        const parts = item.key.split('::');
        const version = parts[0];
        const sourceLang = parts[1] || 'en';
        const targetLang = parts[2] || 'en';
        const originalText = parts.slice(3).join('::');
        return {
            key: item.key,
            version,
            sourceLang,
            targetLang,
            originalText,
            translatedText: item.value
        };
    });
};

const updateCachedTranslation = async (key, translatedText) => {
    translationCache.set(key, translatedText);
    if (!redis) {
        saveCacheToDisk();
    } else {
        try {
            await redis.set(key, translatedText);
        } catch (e) {
            console.warn('[Auto-Translate] Redis set failed in updateCachedTranslation:', e.message);
        }
    }
};

const deleteCachedTranslation = async (key) => {
    translationCache.delete(key);
    if (!redis) {
        saveCacheToDisk();
    } else {
        try {
            await redis.del(key);
        } catch (e) {
            console.warn('[Auto-Translate] Redis del failed in deleteCachedTranslation:', e.message);
        }
    }
};

const getCacheStats = () => {
    return {
        l1Size: translationCache.size,
        maxEntries: MAX_CACHE_ENTRIES,
        redisConnected: !!redis
    };
};

module.exports = {
    translateText,
    translateTexts,
    getAllCachedTranslations,
    updateCachedTranslation,
    deleteCachedTranslation,
    getCacheStats
};
