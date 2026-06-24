const TEXT_CACHE_STORAGE_KEY = 'portfolio-translate-text-cache-v11';
const HTML_CACHE_STORAGE_KEY = 'portfolio-translate-html-cache-v11';

export const clearTranslationCache = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(TEXT_CACHE_STORAGE_KEY);
        window.localStorage.removeItem(HTML_CACHE_STORAGE_KEY);
    } catch {}
};

export const shouldRunLiveClientTranslation = () => false;
