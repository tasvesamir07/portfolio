import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'portfolio-language';
const TEXT_CACHE_STORAGE_KEY = 'portfolio-translate-text-cache-v11';
const HTML_CACHE_STORAGE_KEY = 'portfolio-translate-html-cache-v11';

export const clearTranslationCache = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(TEXT_CACHE_STORAGE_KEY);
        window.localStorage.removeItem(HTML_CACHE_STORAGE_KEY);
    } catch {
        // Ignore errors
    }
};

const isAdminRoute = () =>
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

export const shouldRunLiveClientTranslation = () => {
    if (isAdminRoute()) return true;
    if (typeof window !== 'undefined') {
        const currentLang = window.localStorage.getItem(STORAGE_KEY) || 'en';
        if (currentLang !== 'en') return true;
    }
    return false;
};

export const translateText = async (text = '', language = 'en') => {
    const engine = await import('./translator-engine');
    return engine.translateText(text, language);
};

export const translateHtml = async (html = '', language = 'en') => {
    const engine = await import('./translator-engine');
    return engine.translateHtml(html, language);
};

export const translateApiData = async (value, language = 'en', key = '') => {
    const engine = await import('./translator-engine');
    return engine.translateApiData(value, language, key);
};

export const clearTranslationCaches = () => {
    import('./translator-engine').then(m => m.clearTranslationCaches()).catch(() => {});
};

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

export const useTranslatedTexts = (texts, language, options = {}) => {
    const [translated, setTranslated] = useState(texts);
    const prevKey = useRef(null);
    const force = options?.force === true;

    useEffect(() => {
        const key = `${language}::texts::${texts ? texts.join('||') : ''}`;
        if (prevKey.current === key && !force) return;
        prevKey.current = key;

        if (!texts?.length || (!force && !shouldRunLiveClientTranslation())) {
            setTranslated(texts);
            return;
        }

        setTranslated(texts); // Show originals while loading
        Promise.all(texts.map(t => translateText(t, language)))
            .then(setTranslated)
            .catch(() => setTranslated(texts));
    }, [texts, language, force]);

    return translated;
};

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
