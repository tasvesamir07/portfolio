import axios from 'axios';
import { useState, useEffect, useRef } from 'react';

let defaultBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (defaultBaseUrl && !defaultBaseUrl.endsWith('/api') && !defaultBaseUrl.endsWith('/api/')) {
    defaultBaseUrl = defaultBaseUrl.replace(/\/$/, '') + '/api';
}
const TRANSLATE_API_URL = `${defaultBaseUrl}/translate`;
const STORAGE_KEY = 'portfolio-language';
const MAX_BATCH_ITEMS = 60;
const BATCH_FLUSH_DELAY_MS = 4;
const TEXT_CACHE_STORAGE_KEY = 'portfolio-translate-text-cache-v9';
const HTML_CACHE_STORAGE_KEY = 'portfolio-translate-html-cache-v9';
const MAX_PERSISTED_CACHE_ENTRIES = 250;
const MAX_CONCURRENT_CHUNKS = 5;
const MAX_PARALLEL_BATCH_REQUESTS = 3;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_MS = 60000; // 1 minute

let consecutiveFailures = 0;
let circuitBreakerUntil = 0;

const isCircuitOpen = () => {
    if (Date.now() < circuitBreakerUntil) return true;
    if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreakerUntil = Date.now() + 10000; // Only block for 10 seconds to avoid long periods of no translation
        consecutiveFailures = 0;
        console.warn('Translation circuit breaker opened momentarily.');
        return true;
    }
    return false;
};

const recordFailure = () => {
    consecutiveFailures++;
};

const recordSuccess = () => {
    consecutiveFailures = 0;
};

const textCache = new Map();
const htmlCache = new Map();
const pendingTextBatches = new Map();

const readPersistentCache = (storageKey) => {
    if (typeof window === 'undefined') return {};

    try {
        const rawValue = window.localStorage.getItem(storageKey);
        if (!rawValue) return {};

        const parsed = JSON.parse(rawValue);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const writePersistentCache = (storageKey, cacheObject) => {
    if (typeof window === 'undefined') return;

    try {
        const entries = Object.entries(cacheObject);
        const trimmedEntries = entries.length > MAX_PERSISTED_CACHE_ENTRIES
            ? entries.slice(entries.length - MAX_PERSISTED_CACHE_ENTRIES)
            : entries;

        window.localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(trimmedEntries)));
    } catch {
        // Ignore storage quota and serialization failures.
    }
};

const getPersistentTranslation = (storageKey, cacheKey) => {
    const cacheObject = readPersistentCache(storageKey);
    return typeof cacheObject[cacheKey] === 'string' ? cacheObject[cacheKey] : null;
};

const setPersistentTranslation = (storageKey, cacheKey, value) => {
    if (typeof value !== 'string') return;

    const cacheObject = readPersistentCache(storageKey);
    cacheObject[cacheKey] = value;
    writePersistentCache(storageKey, cacheObject);
};

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
    'file_path',
    'file_name',
    'mimetype',
    'size'
]);

const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
const LATIN_REGEX = /[A-Za-z]/;

const isLikelyAlreadyInTargetLanguage = (text = '', language = 'en') => {
    const trimmed = text.trim();
    if (!trimmed) return true;

    const hasBangla = BANGLA_REGEX.test(trimmed);
    const hasHangul = HANGUL_REGEX.test(trimmed);
    const hasLatin = LATIN_REGEX.test(trimmed);

    if (language === 'en') {
        // English target still needs translation whenever Bangla/Korean scripts are present.
        return !hasBangla && !hasHangul;
    }

    if (language === 'bn') {
        // Mixed Bangla+English content should still be translated to fully Bangla.
        return hasBangla && !hasHangul && !hasLatin;
    }

    if (language === 'ko') {
        // Mixed Korean+English content should still be translated to fully Korean.
        return hasHangul && !hasBangla && !hasLatin;
    }

    return false;
};

const HTML_REGEX = /<[a-z][\s\S]*>/i;
const URLISH_REGEX = /^(https?:\/\/|mailto:|tel:|data:|\/uploads\/)/i;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const NON_TRANSLATABLE_SYMBOLIC_REGEX = /^[\d\s.,:/()\-+%]+$/;

const getCurrentLanguage = () => {
    if (typeof window === 'undefined') return 'en';
    return window.localStorage.getItem(STORAGE_KEY) || 'en';
};

const shouldSkipStringTranslation = (key = '', value = '') => {
    if (!value || !value.trim()) return true;
    const trimmed = value.trim();
    if (SKIP_TRANSLATION_KEYS.has(key) || key.endsWith('_url')) return true;
    if (URLISH_REGEX.test(trimmed)) return true;
    if (EMAIL_REGEX.test(trimmed)) return true;
    if (NON_TRANSLATABLE_SYMBOLIC_REGEX.test(trimmed)) return true;
    return false;
};

const requestTranslatedTexts = async (texts, language) => {
    if (isCircuitOpen()) {
        return texts;
    }

    try {
        const response = await axios.post(TRANSLATE_API_URL, {
            texts,
            targetLang: language
        }, {
            timeout: 35000 // Increased timeout for heavier chunks
        });

        if (!response.data?.translations) {
            console.warn('Translate API returned no translations:', response.data);
            return texts;
        }

        recordSuccess();
        return Array.isArray(response.data?.translations) ? response.data.translations : texts;
    } catch (error) {
        recordFailure();
        console.error('Translate API request failed:', error.response?.data || error.message);
        throw error;
    }
};

const processInChunks = async (items, chunkSize, processor) => {
    const results = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk.map(item => processor(item)));
        results.push(...chunkResults);
    }
    return results;
};

const runWithConcurrency = async (items, concurrency, worker) => {
    const safeConcurrency = Math.max(1, Math.min(concurrency, items.length || 1));
    const results = new Array(items.length);
    let nextIndex = 0;

    const workers = Array.from({ length: safeConcurrency }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++;
            results[currentIndex] = await worker(items[currentIndex], currentIndex);
        }
    });

    await Promise.all(workers);
    return results;
};

const batchTranslateTexts = async (texts, language) => {
    if (!texts.length) {
        return texts;
    }

    const uniqueTexts = [...new Set(texts)];
    const translationMap = new Map();

    const chunks = [];
    for (let index = 0; index < uniqueTexts.length; index += MAX_BATCH_ITEMS) {
        chunks.push(uniqueTexts.slice(index, index + MAX_BATCH_ITEMS));
    }

    const chunkEntries = await runWithConcurrency(chunks, MAX_PARALLEL_BATCH_REQUESTS, async (chunk) => {
        try {
            const translatedChunk = await requestTranslatedTexts(chunk, language);
            return chunk.map((text, chunkIndex) => [text, translatedChunk[chunkIndex] || text]);
        } catch {
            return chunk.map((text) => [text, text]);
        }
    });

    chunkEntries.flat().forEach(([text, translated]) => {
        translationMap.set(text, translated);
    });

    return texts.map((text) => translationMap.get(text) || text);
};

const flushPendingTextBatch = async (language) => {
    const batch = pendingTextBatches.get(language);
    if (!batch) return;

    pendingTextBatches.delete(language);
    const texts = [...batch.entries.keys()];

    try {
        const translations = await batchTranslateTexts(texts, language);
        texts.forEach((text, index) => {
            const entry = batch.entries.get(text);
            if (!entry) return;

            const translatedText = translations[index] || text;
            entry.resolvers.forEach((resolve) => resolve(translatedText));
        });
    } catch (error) {
        texts.forEach((text) => {
            const entry = batch.entries.get(text);
            if (!entry) return;
            entry.resolvers.forEach((resolve) => resolve(text));
        });
    }
};

const queueTextTranslation = (text, language) => {
    let batch = pendingTextBatches.get(language);

    if (!batch) {
        batch = {
            entries: new Map(),
            timer: null
        };
        pendingTextBatches.set(language, batch);
    }

    if (!batch.entries.has(text)) {
        batch.entries.set(text, { resolvers: [] });
    }

    const entry = batch.entries.get(text);

    const promise = new Promise((resolve) => {
        entry.resolvers.push(resolve);
    });

    if (!batch.timer) {
        batch.timer = setTimeout(() => {
            flushPendingTextBatch(language);
        }, BATCH_FLUSH_DELAY_MS);
    }

    return promise;
};

export const translateText = async (text = '', language = 'en') => {
    if (!text || !text.trim()) return text;
    
    const trimmed = text.trim();
    if (isLikelyAlreadyInTargetLanguage(trimmed, language)) return text;

    // Preserve newlines and formatting by splitting into fragments
    // This also helps avoid hitting character limits for long blocks
    if (text.includes('\n') || text.length > 500) {
        // Split by lines but keep empty lines/newlines by using a regex that captures separators
        const fragments = text.split(/(\r?\n)/);
        if (fragments.length > 1) {
            const translatedFragments = await processInChunks(
                fragments,
                10,
                async (frag) => {
                    // Don't translate line breaks or empty whitespace strings
                    if (!frag || frag.match(/^\r?\n$/) || !frag.trim()) return frag;
                    
                    // If a single paragraph is still too long, recursively call translateText
                    // so it can handle sentence splitting if needed.
                    return translateText(frag, language);
                }
            );
            return translatedFragments.join('');
        }
    }

    // Sentence splitting for individual long paragraphs that haven't been broken down by line breaks
    if (trimmed.length > 350) {
        // Split by major punctuation followed by whitespace
        const sentences = trimmed.split(/(?<=[.!?])\s+(?=[A-Z\u0980-\u09FF\uAC00-\uD7AF])/);
        if (sentences.length > 1) {
            const translatedSentences = await processInChunks(
                sentences,
                MAX_CONCURRENT_CHUNKS,
                s => translateText(s, language)
            );
            return translatedSentences.join(' ');
        }
    }

    const cacheKey = `${language}::text::${trimmed}`;
    const persistedValue = getPersistentTranslation(TEXT_CACHE_STORAGE_KEY, cacheKey);

    if (persistedValue != null) {
        textCache.set(cacheKey, Promise.resolve(persistedValue));
    }

    if (!textCache.has(cacheKey)) {
        textCache.set(cacheKey, (async () => {
            try {
                const translated = await queueTextTranslation(trimmed, language);
                const resolved = translated || trimmed;
                if (resolved !== trimmed || isLikelyAlreadyInTargetLanguage(resolved, language)) {
                    setPersistentTranslation(TEXT_CACHE_STORAGE_KEY, cacheKey, resolved);
                }
                return resolved;
            } catch {
                return trimmed;
            }
        })());
    }

    const translated = await textCache.get(cacheKey);
    const leadingWhitespace = text.match(/^\s*/)?.[0] || '';
    const trailingWhitespace = text.match(/\s*$/)?.[0] || '';
    return `${leadingWhitespace}${translated}${trailingWhitespace}`;
};

const isAdminRoute = () =>
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

export const shouldRunLiveClientTranslation = () => isAdminRoute();

export const translateHtml = async (html = '', language = getCurrentLanguage()) => {
    if (!html) return html;

    // If it's not really HTML, just treat it as a long text block
    if (!HTML_REGEX.test(html)) {
        return translateText(html, language);
    }

    const plainText = html.replace(/<[^>]+>/g, ' ');
    if (isLikelyAlreadyInTargetLanguage(plainText, language)) return html;

    if (typeof window === 'undefined') return html;

    const cacheKey = `${language}::html::${html}`;
    const persistedValue = getPersistentTranslation(HTML_CACHE_STORAGE_KEY, cacheKey);

    if (persistedValue != null) {
        htmlCache.set(cacheKey, Promise.resolve(persistedValue));
    }

    if (htmlCache.has(cacheKey)) {
        return htmlCache.get(cacheKey);
    }

    const translationPromise = (async () => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const textNodes = [];

        const collectTextNodes = (node) => {
            if (!node) return;

            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || '';
                if (text.trim()) {
                    textNodes.push(node);
                }
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) return;

            const tag = node.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style') return;

            Array.from(node.childNodes).forEach(collectTextNodes);
        };

        collectTextNodes(doc.body);

        const uniqueTexts = [...new Set(textNodes.map((node) => (node.textContent || '').trim()).filter(Boolean))];
        
        // Use translateText for each unique text fragment to benefit from paragraph splitting and script detection
        const translatedTexts = await Promise.all(uniqueTexts.map(text => translateText(text, language)));
        const translationMap = new Map(uniqueTexts.map((text, index) => [text, translatedTexts[index] || text]));

        textNodes.forEach((node) => {
            const original = node.textContent || '';
            const trimmed = original.trim();
            const translated = translationMap.get(trimmed) || trimmed;
            const leadingWhitespace = original.match(/^\s*/)?.[0] || '';
            const trailingWhitespace = original.match(/\s*$/)?.[0] || '';
            node.textContent = `${leadingWhitespace}${translated}${trailingWhitespace}`;
        });

        const translatedHtml = doc.body.innerHTML;
        const translatedPlainText = translatedHtml.replace(/<[^>]+>/g, ' ');
        if (translatedHtml !== html || isLikelyAlreadyInTargetLanguage(translatedPlainText, language)) {
            setPersistentTranslation(HTML_CACHE_STORAGE_KEY, cacheKey, translatedHtml);
        }
        return translatedHtml;
    })();

    htmlCache.set(cacheKey, translationPromise);
    return translationPromise;
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

const translateStructuredJson = async (value = '', language = getCurrentLanguage()) => {
    if (!value) return value;

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return value;

        const translated = await Promise.all(parsed.map(async (item) => {
            if (!item || typeof item !== 'object') return item;

            const result = { ...item };

            if (typeof result.title === 'string' && result.title.trim()) {
                result.title = await translateText(result.title, language);
            }

            if (typeof result.text === 'string' && result.text.trim()) {
                result.text = HTML_REGEX.test(result.text)
                    ? await translateHtml(result.text, language)
                    : await translateText(result.text, language);
            }

            if (typeof result.value === 'string' && result.value.trim()) {
                result.value = HTML_REGEX.test(result.value)
                    ? await translateHtml(result.value, language)
                    : await translateText(result.value, language);
            }

            if (Array.isArray(result.values)) {
                result.values = await Promise.all(result.values.map(async (entry) => {
                    if (typeof entry !== 'string' || !entry.trim()) return entry;
                    return HTML_REGEX.test(entry)
                        ? translateHtml(entry, language)
                        : translateText(entry, language);
                }));
            }

            return result;
        }));

        return JSON.stringify(translated);
    } catch {
        return value;
    }
};

export const translateApiData = async (value, language = getCurrentLanguage(), key = '') => {
    if (value == null || SKIP_TRANSLATION_KEYS.has(key)) {
        return value;
    }

    const translationPromise = (async () => {
        if (typeof value === 'string') {
            if (shouldSkipStringTranslation(key, value)) return value;
            const detectionSample = HTML_REGEX.test(value) ? value.replace(/<[^>]+>/g, ' ') : value;
            // Don't re-translate content already in the target language
            if (isLikelyAlreadyInTargetLanguage(detectionSample, language)) return value;
            if (looksLikeStructuredJson(value, key)) return translateStructuredJson(value, language);
            if (HTML_REGEX.test(value)) return translateHtml(value, language);
            return translateText(value, language);
        }

        if (Array.isArray(value)) {
            return Promise.all(value.map((entry) => translateApiData(entry, language, key)));
        }

        if (typeof value === 'object') {
            const entries = await Promise.all(
                Object.entries(value).map(async ([entryKey, entryValue]) => [
                    entryKey,
                    await translateApiData(entryValue, language, entryKey)
                ])
            );

            return Object.fromEntries(entries);
        }

        return value;
    })();

    return translationPromise;
};

/**
 * Call this whenever the user switches languages.
 * Clears in-memory translation caches so the new language is fully re-translated.
 */
export const clearTranslationCaches = () => {
    textCache.clear();
    htmlCache.clear();
    pendingTextBatches.clear();
    // Reset circuit breaker so stale failures don't block the new language
    consecutiveFailures = 0;
    circuitBreakerUntil = 0;
};

/**
 * React hook: translate a single string.
 * Returns the original value immediately, then updates when translation arrives.
 */
export const useTranslatedText = (text, language, options = {}) => {
    const [translated, setTranslated] = useState(text);
    const prevKey = useRef(null);
    const force = options?.force === true;

    useEffect(() => {
        const key = `${language}::${text}`;
        if (prevKey.current === key) return;
        prevKey.current = key;

        if (!text || (!force && !shouldRunLiveClientTranslation())) {
            setTranslated(text);
            return;
        }

        setTranslated(text); // Show original while loading
        translateText(text, language).then(setTranslated).catch(() => setTranslated(text));
    }, [text, language, force]);

    return translated;
};

/**
 * React hook: translate an array of strings in batch.
 * Returns originals immediately, then updates each as translations arrive.
 */
export const useTranslatedTexts = (texts, language, options = {}) => {
    const [translated, setTranslated] = useState(texts);
    const prevKey = useRef(null);
    const force = options?.force === true;

    useEffect(() => {
        const key = `${language}::${JSON.stringify(texts)}`;
        if (prevKey.current === key) return;
        prevKey.current = key;

        if (!texts?.length || (!force && !shouldRunLiveClientTranslation())) {
            setTranslated(texts);
            return;
        }

        setTranslated(texts); // Show originals while loading
        Promise.all(texts.map(t => translateText(t, language)))
            .then(setTranslated)
            .catch(() => setTranslated(texts));
    }, [JSON.stringify(texts), language, force]);

    return translated;
};

/**
 * React hook: translate a block of HTML.
 * Returns the original HTML immediately, then updates when translated.
 */
export const useTranslatedHtml = (html, language, options = {}) => {
    const [translated, setTranslated] = useState(html);
    const prevKey = useRef(null);
    const force = options?.force === true;

    useEffect(() => {
        const key = `${language}::html::${html}`;
        if (prevKey.current === key) return;
        prevKey.current = key;

        if (!html || (!force && !shouldRunLiveClientTranslation())) {
            setTranslated(html);
            return;
        }

        setTranslated(html); // Show original while loading
        translateHtml(html, language).then(setTranslated).catch(() => setTranslated(html));
    }, [html, language, force]);

    return translated;
};
