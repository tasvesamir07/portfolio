import axios from 'axios';

let defaultBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (defaultBaseUrl && !defaultBaseUrl.endsWith('/api') && !defaultBaseUrl.endsWith('/api/')) {
    defaultBaseUrl = defaultBaseUrl.replace(/\/$/, '') + '/api';
}
const TRANSLATE_API_URL = `${defaultBaseUrl}/translate`;
const STORAGE_KEY = 'portfolio-language';
const MAX_BATCH_ITEMS = 20;
const BATCH_FLUSH_DELAY_MS = 12;
const TEXT_CACHE_STORAGE_KEY = 'portfolio-translate-text-cache-v4';
const HTML_CACHE_STORAGE_KEY = 'portfolio-translate-html-cache-v4';
const MAX_PERSISTED_CACHE_ENTRIES = 250;

const textCache = new Map();
const htmlCache = new Map();
const dataCache = new Map();
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
    'custom_nav'
]);

const HTML_REGEX = /<[a-z][\s\S]*>/i;
const URLISH_REGEX = /^(https?:\/\/|mailto:|tel:|data:|\/uploads\/)/i;

const getCurrentLanguage = () => {
    if (typeof window === 'undefined') return 'en';
    return window.localStorage.getItem(STORAGE_KEY) || 'en';
};

const shouldSkipStringTranslation = (key = '', value = '') => {
    if (!value || !value.trim()) return true;
    if (SKIP_TRANSLATION_KEYS.has(key) || key.endsWith('_url')) return true;
    if (URLISH_REGEX.test(value.trim())) return true;
    return false;
};

const requestTranslatedTexts = async (texts, language) => {
    const response = await axios.post(TRANSLATE_API_URL, {
        texts,
        targetLang: language
    }, {
        timeout: 25000
    });

    return Array.isArray(response.data?.translations) ? response.data.translations : texts;
};

const batchTranslateTexts = async (texts, language) => {
    if (!texts.length) {
        return texts;
    }

    const uniqueTexts = [...new Set(texts)];
    const translationMap = new Map();

    for (let index = 0; index < uniqueTexts.length; index += MAX_BATCH_ITEMS) {
        const chunk = uniqueTexts.slice(index, index + MAX_BATCH_ITEMS);
        const translatedChunk = await requestTranslatedTexts(chunk, language);

        chunk.forEach((text, chunkIndex) => {
            translationMap.set(text, translatedChunk[chunkIndex] || text);
        });
    }

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

export const translateText = async (value = '', language = getCurrentLanguage()) => {
    if (!value || !value.trim()) return value;

    const trimmed = value.trim();
    const cacheKey = `${language}::text::${trimmed}`;
    const persistedValue = getPersistentTranslation(TEXT_CACHE_STORAGE_KEY, cacheKey);

    if (persistedValue != null) {
        textCache.set(cacheKey, Promise.resolve(persistedValue));
    }

    if (!textCache.has(cacheKey)) {
        textCache.set(cacheKey, (async () => {
            const translated = await queueTextTranslation(trimmed, language);
            setPersistentTranslation(TEXT_CACHE_STORAGE_KEY, cacheKey, translated || trimmed);
            return translated || trimmed;
        })());
    }

    const translated = await textCache.get(cacheKey);
    const leadingWhitespace = value.match(/^\s*/)?.[0] || '';
    const trailingWhitespace = value.match(/\s*$/)?.[0] || '';
    return `${leadingWhitespace}${translated}${trailingWhitespace}`;
};

export const translateHtml = async (html = '', language = getCurrentLanguage()) => {
    if (!html || !HTML_REGEX.test(html) || typeof window === 'undefined') {
        return html;
    }

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
        const translatedTexts = await batchTranslateTexts(uniqueTexts, language);
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
        setPersistentTranslation(HTML_CACHE_STORAGE_KEY, cacheKey, translatedHtml);
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

    const cacheKey = `${language}::${key || 'root'}::${JSON.stringify(value)}`;
    if (dataCache.has(cacheKey)) {
        return dataCache.get(cacheKey);
    }

    const translationPromise = (async () => {
        if (typeof value === 'string') {
            if (shouldSkipStringTranslation(key, value)) return value;
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

    dataCache.set(cacheKey, translationPromise);
    return translationPromise;
};
