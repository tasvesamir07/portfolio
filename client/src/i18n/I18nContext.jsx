import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supportedLanguages } from './translations';
import en from './locales/en.js';
import bn from './locales/bn.js';
import ko from './locales/ko.js';

const STORAGE_KEY = 'portfolio-language';
const defaultLanguage = 'en';

const ALL_TRANSLATIONS = { en, bn, ko };

const I18nContext = createContext(null);

const applyLanguageSideEffects = (language) => {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = language === 'bn' ? 'bn-BD' : language === 'ko' ? 'ko-KR' : 'en';
    }
};

const getTranslationValue = (loadedTranslations, language, key) => {
    const segments = key.split('.');
    let current = loadedTranslations[language];

    for (const segment of segments) {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }
        current = current[segment];
    }

    return current;
};

const interpolate = (value, variables = {}) =>
    Object.entries(variables).reduce(
        (result, [token, replacement]) => result.replaceAll(`{{${token}}}`, String(replacement)),
        value
    );

export const I18nProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        if (typeof window === 'undefined') {
            return defaultLanguage;
        }

        const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
        return supportedLanguages.some((item) => item.code === storedLanguage) ? storedLanguage : defaultLanguage;
    });

    const setLanguage = (nextLanguage) => {
        const resolvedLanguage = supportedLanguages.some((item) => item.code === nextLanguage) ? nextLanguage : defaultLanguage;

        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, resolvedLanguage);
        }

        applyLanguageSideEffects(resolvedLanguage);

        if (resolvedLanguage !== language) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('portfolio:languageChange', { detail: { language: resolvedLanguage } }));
            }
            setLanguageState(resolvedLanguage);
            return;
        }

        setLanguageState(resolvedLanguage);
    };

    useEffect(() => {
        applyLanguageSideEffects(language);
    }, [language]);

    const t = useCallback((key, variables = {}) => {
        const localizedValue = getTranslationValue(ALL_TRANSLATIONS, language, key) ?? getTranslationValue(ALL_TRANSLATIONS, defaultLanguage, key) ?? key;
        return typeof localizedValue === 'string' ? interpolate(localizedValue, variables) : key;
    }, [language]);

    return (
        <I18nContext.Provider value={{ language, setLanguage, t, languages: supportedLanguages }}>
            {children}
        </I18nContext.Provider>
    );
};

export const useI18n = () => {
    const context = useContext(I18nContext);

    if (!context) {
        throw new Error('useI18n must be used inside I18nProvider');
    }

    return context;
};
