import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supportedLanguages } from './translations';
import type { LanguageOption } from './translations';
import type { LanguageCode } from '../types';
import en from './locales/en';
import bn from './locales/bn';
import ko from './locales/ko';

const STORAGE_KEY = 'portfolio-language';
const defaultLanguage: LanguageCode = 'en';

const ALL_TRANSLATIONS: Record<LanguageCode, Record<string, unknown>> = { en, bn, ko };

export type TFunction = (key: string, variables?: Record<string, string | number>) => string;

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: TFunction;
  languages: LanguageOption[];
}

const applyLanguageSideEffects = (language: LanguageCode): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language === 'bn' ? 'bn-BD' : language === 'ko' ? 'ko-KR' : 'en';
  }
};

const getTranslationValue = (
  loadedTranslations: Record<LanguageCode, Record<string, unknown>>,
  language: LanguageCode,
  key: string
): unknown => {
  const segments = key.split('.');
  let current: unknown = loadedTranslations[language];

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const interpolate = (value: string, variables: Record<string, string | number> = {}): string =>
  Object.entries(variables).reduce(
    (result, [token, replacement]) => result.replaceAll(`{{${token}}}`, String(replacement)),
    value
  );

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') {
      return defaultLanguage;
    }
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
    const found = supportedLanguages.some((item) => item.code === storedLanguage);
    return found ? storedLanguage as LanguageCode : defaultLanguage;
  });

  const setLanguage = (nextLanguage: LanguageCode): void => {
    const resolvedLanguage: LanguageCode = supportedLanguages.some((item) => item.code === nextLanguage)
      ? nextLanguage
      : defaultLanguage;

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

  const t: TFunction = useCallback((key: string, variables: Record<string, string | number> = {}) => {
    const localizedValue = getTranslationValue(ALL_TRANSLATIONS, language, key)
      ?? getTranslationValue(ALL_TRANSLATIONS, defaultLanguage, key)
      ?? key;
    return typeof localizedValue === 'string' ? interpolate(localizedValue, variables) : key;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, languages: supportedLanguages }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
};
