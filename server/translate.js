let translator = null;
const translationCache = new Map();
const MAX_CACHE_ENTRIES = 6000;
const CHUNK_CONCURRENCY = 8;
const CACHE_VERSION = 'v2';
const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;

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

    if (sourceLanguage === targetLanguage) {
        return text;
    }

    const cached = readCachedTranslation(text, targetLanguage, sourceLanguage);
    if (cached != null) {
        return cached;
    }

    try {
        const translate = await getTranslator();
        const translated = await translate(text, { from: sourceLanguage, to: targetLanguage });
        writeCachedTranslation(text, targetLanguage, sourceLanguage, translated || text);
        return translated || text;
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
