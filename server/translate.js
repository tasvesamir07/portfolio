let translator = null;
const translationCache = new Map();
const MAX_CACHE_ENTRIES = 6000;
const CHUNK_CONCURRENCY = 8;
const CACHE_VERSION = 'v4';
const GOOGLE_TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
const LATIN_REGEX = /[A-Za-z]/;

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

const splitForRetry = (text = '') => {
    const normalized = String(text || '');
    const parts = normalized
        .split(/(\r?\n+|(?<=[.!?।])\s+)/)
        .filter((part) => part != null && part !== '');
    return parts.length > 1 ? parts : [normalized];
};

const looksLikeBrokenTranslation = (translated = '', original = '', targetLanguage = 'en') => {
    const normalized = String(translated || '').trim();
    if (!normalized) return true;
    if (/^\?+(?:\s+\?+)*$/.test(normalized)) return true;

    // If the result still clearly contains source-script text for the target, treat it as unresolved.
    if (needsTranslationForTarget(original, targetLanguage) && needsTranslationForTarget(normalized, targetLanguage)) {
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

const readCachedTranslation = (text = '', targetLanguage = 'en', sourceLanguage = 'en') => {
    const key = getCacheKey(text, targetLanguage, sourceLanguage);
    if (!translationCache.has(key)) return null;

    const value = translationCache.get(key);
    // Refresh insertion order for basic LRU behavior.
    translationCache.delete(key);
    translationCache.set(key, value);
    return value;
};

const writeCachedTranslation = (text = '', targetLanguage = 'en', sourceLanguage = 'en', translated = '') => {
    const key = getCacheKey(text, targetLanguage, sourceLanguage);
    translationCache.set(key, translated);
    trimCache();
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

    const cached = readCachedTranslation(text, targetLanguage, sourceLanguage);
    if (cached != null) {
        return cached;
    }

    try {
        const fragments = splitForRetry(text);
        if (fragments.length > 1 && (String(text).includes('\n') || String(text).length > 280)) {
            const translatedFragments = await processInChunks(
                fragments,
                CHUNK_CONCURRENCY,
                (fragment) => translateText(fragment, language)
            );
            const resolved = translatedFragments.join('');

            if (!looksLikeBrokenTranslation(resolved, text, targetLanguage)) {
                writeCachedTranslation(text, targetLanguage, sourceLanguage, resolved);
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
                const translatedFragments = await processInChunks(
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
            writeCachedTranslation(text, targetLanguage, sourceLanguage, resolved);
        }

        return resolved;
    } catch (error) {
        console.error(`Translation proxy failed:`, error.message);
        return text;
    }
};

/**
 * Helper to process an array in chunks.
 */
const processInChunks = async (items, chunkSize, processor) => {
    const results = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk.map((item) => processor(item)));
        results.push(...chunkResults);
    }
    return results;
};

/**
 * Batch translation proxy.
 * Processes small batches incoming from the frontend with chunked concurrency.
 */
const translateTexts = async (texts = [], language = 'en') => {
    if (!texts || texts.length === 0) return [];

    const normalizedTexts = texts.map((text) => String(text || ''));
    const uniqueTexts = [...new Set(normalizedTexts)];
    const unresolved = uniqueTexts.filter((text) => {
        const targetLanguage = normalizeTargetLanguage(language);
        if (!needsTranslationForTarget(text, targetLanguage)) return false;
        const sourceLanguage = detectSourceLanguage(text, targetLanguage);
        if (sourceLanguage === targetLanguage) return false;
        return readCachedTranslation(text, targetLanguage, sourceLanguage) == null;
    });

    if (unresolved.length > 0) {
        await processInChunks(
            unresolved,
            CHUNK_CONCURRENCY,
            (text) => translateText(text, language)
        );
    }

    return normalizedTexts.map((text) => {
        const targetLanguage = normalizeTargetLanguage(language);
        if (!needsTranslationForTarget(text, targetLanguage)) return text;
        const sourceLanguage = detectSourceLanguage(text, targetLanguage);
        if (sourceLanguage === targetLanguage) return text;
        const cached = readCachedTranslation(text, targetLanguage, sourceLanguage);
        return cached != null ? cached : text;
    });
};

module.exports = {
    translateText,
    translateTexts
};
