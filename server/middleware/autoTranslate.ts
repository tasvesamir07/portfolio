import fs = require('fs');
const logger = require('../utils/logger');
import path = require('path');
import type { Request, Response, NextFunction } from 'express';

const { translateTexts, redis } = require('../translate');

let glossary: Record<string, Record<string, string>> = {};
try {
    glossary = require('../glossary.json');
} catch (e: unknown) {
    logger.warn('[Auto-Translate Middleware] Failed to require glossary:', (e as any).message || String(e));
}

const applyGlossaryToText = (text: string, language = 'en'): string => {
    if (!text || typeof text !== 'string') return text;

    let processed = text;
    const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);

    for (const term of terms) {
        const replacement = glossary[term]?.[language];
        if (!replacement) continue;

        const sourceVariants = new Set([term]);
        Object.values(glossary[term]).forEach(val => {
            if (val) sourceVariants.add(val);
        });

        sourceVariants.delete(replacement);

        for (const variant of sourceVariants) {
            const escaped = variant.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const isEnglish = /^[A-Za-z\s]+$/.test(variant);
            const regexStr = isEnglish ? `\\b${escaped}\\b` : escaped;
            const regex = new RegExp(regexStr, 'gi');
            processed = processed.replace(regex, replacement);
        }
    }

    return processed;
};

const LANGUAGE_HEADER = 'x-translate-language';
const SKIP_TRANSLATION_HEADER = 'x-skip-auto-translate';
const RESPONSE_TRANSLATED_HEADER = 'X-Response-Translated';
const RESPONSE_TRANSLATION_CACHE_VERSION = 'v6';

const MAX_RESPONSE_CACHE_ENTRIES = 2000;
const responseTranslationCache = new Map<string, unknown>();

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

type Language = 'en' | 'bn' | 'ko';

const normalizeTargetLanguage = (language = 'en'): Language => {
    if (language === 'bn') return 'bn';
    if (language === 'ko') return 'ko';
    return 'en';
};

const isLikelyAlreadyInTargetLanguage = (value = '', language = 'en'): boolean => {
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

const shouldSkipStringTranslation = (key = '', value = '', language = 'en'): boolean => {
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

const translatePlainText = async (value = '', language = 'en'): Promise<string> => {
    if (!value || !value.trim()) return value;
    const [translated] = await translateTexts([value.trim()], language);
    const leadingWhitespace = value.match(/^\s*/)?.[0] || '';
    const trailingWhitespace = value.match(/\s*$/)?.[0] || '';
    return `${leadingWhitespace}${translated || value.trim()}${trailingWhitespace}`;
};

const translateHtmlContent = async (html = '', language = 'en'): Promise<string> => {
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

const looksLikeStructuredJson = (value = '', key = ''): boolean => {
    if (!value || !value.trim().startsWith('[')) return false;

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return false;

        if (key.includes('details_json') || key.startsWith('sub_bio')) {
            return true;
        }

        return parsed.every((item: unknown) =>
            item
            && typeof item === 'object'
            && (
                typeof (item as any).type === 'string'
                || typeof (item as any).title === 'string'
                || typeof (item as any).text === 'string'
                || Array.isArray((item as any).values)
            )
        );
    } catch {
        return false;
    }
};

const trimResponseTranslationCache = (): void => {
    if (responseTranslationCache.size <= MAX_RESPONSE_CACHE_ENTRIES) return;

    const oldestKey = responseTranslationCache.keys().next().value;
    if (oldestKey) {
        responseTranslationCache.delete(oldestKey);
    }
};

const buildResponseTranslationCacheKey = (req: Request, language = 'en'): string =>
    `${RESPONSE_TRANSLATION_CACHE_VERSION}::${language}::${req.originalUrl || req.path || ''}`;

const shouldServerTranslateResponse = (req: Request, language = 'en'): boolean => {
    const normalizedLanguage = normalizeTargetLanguage(language);
    if (!['en', 'bn', 'ko'].includes(normalizedLanguage)) return false;
    if (req.headers?.[SKIP_TRANSLATION_HEADER] === '1') return false;
    return true;
};

const collectTranslatableStrings = (value: unknown, language = 'en', key = '', collected = new Set<string>()): void => {
    if (value == null || SKIP_TRANSLATION_KEYS.has(key) || (typeof key === 'string' && key.endsWith('_url'))) {
        return;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed && !shouldSkipStringTranslation(key, trimmed, language)) {
            if (looksLikeStructuredJson(trimmed, key)) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((item: any) => {
                            if (!item || typeof item !== 'object') return;
                            if (typeof item.title === 'string' && item.title.trim() && !shouldSkipStringTranslation(key, item.title.trim(), language)) {
                                collected.add(item.title.trim());
                            }
                            if (typeof item.text === 'string' && item.text.trim()) {
                                if (HTML_REGEX.test(item.text)) {
                                    const segments = item.text.split(/(<[^>]+>)/g);
                                    segments.forEach((segment: string) => {
                                        if (segment && !segment.startsWith('<') && segment.trim() && !shouldSkipStringTranslation(key, segment.trim(), language)) {
                                            collected.add(segment.trim());
                                        }
                                    });
                                } else if (!shouldSkipStringTranslation(key, item.text.trim(), language)) {
                                    collected.add(item.text.trim());
                                }
                            }
                            if (typeof item.value === 'string' && item.value.trim()) {
                                if (HTML_REGEX.test(item.value)) {
                                    const segments = item.value.split(/(<[^>]+>)/g);
                                    segments.forEach((segment: string) => {
                                        if (segment && !segment.startsWith('<') && segment.trim() && !shouldSkipStringTranslation(key, segment.trim(), language)) {
                                            collected.add(segment.trim());
                                        }
                                    });
                                } else if (!shouldSkipStringTranslation(key, item.value.trim(), language)) {
                                    collected.add(item.value.trim());
                                }
                            }
                            if (Array.isArray(item.values)) {
                                item.values.forEach((v: any) => {
                                    if (typeof v === 'string' && v.trim()) {
                                        if (HTML_REGEX.test(v)) {
                                            const segments = v.split(/(<[^>]+>)/g);
                                            segments.forEach((segment: string) => {
                                                if (segment && !segment.startsWith('<') && segment.trim() && !shouldSkipStringTranslation(key, segment.trim(), language)) {
                                                    collected.add(segment.trim());
                                                }
                                            });
                                        } else if (!shouldSkipStringTranslation(key, v.trim(), language)) {
                                            collected.add(v.trim());
                                        }
                                    }
                                });
                            }
                        });
                    }
                } catch (e) {
                    // Ignore JSON parsing errors
                }
            } else if (HTML_REGEX.test(trimmed)) {
                const segments = trimmed.split(/(<[^>]+>)/g);
                segments.forEach((segment: string) => {
                    if (segment && !segment.startsWith('<') && segment.trim() && !shouldSkipStringTranslation(key, segment.trim(), language)) {
                        collected.add(segment.trim());
                    }
                });
            } else {
                collected.add(trimmed);
            }
        }
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((entry) => collectTranslatableStrings(entry, language, key, collected));
        return;
    }

    if (typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([entryKey, entryValue]) => {
            collectTranslatableStrings(entryValue, language, entryKey, collected);
        });
    }
};

const applyHtmlTranslations = (html: string, translationMap: Map<string, string>, language = 'en', key = ''): string => {
    if (!html || !HTML_REGEX.test(html)) return html;
    const segments = html.split(/(<[^>]+>)/g);
    return segments.map((segment) => {
        if (!segment || segment.startsWith('<') || !segment.trim()) {
            return segment;
        }
        const trimmed = segment.trim();
        if (shouldSkipStringTranslation(key, trimmed, language)) {
            return segment;
        }
        const translated = translationMap.get(trimmed);
        if (translated) {
            const leadingWhitespace = segment.match(/^\s*/)?.[0] || '';
            const trailingWhitespace = segment.match(/\s*$/)?.[0] || '';
            return `${leadingWhitespace}${translated}${trailingWhitespace}`;
        }
        return segment;
    }).join('');
};

const applyTranslations = (value: unknown, translationMap: Map<string, string>, language = 'en', key = ''): unknown => {
    if (value == null || SKIP_TRANSLATION_KEYS.has(key) || (typeof key === 'string' && key.endsWith('_url'))) {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed || shouldSkipStringTranslation(key, trimmed, language)) {
            return value;
        }

        if (looksLikeStructuredJson(trimmed, key)) {
            try {
                const parsed = JSON.parse(trimmed);
                const translated = parsed.map((item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const result = { ...item };

                    if (typeof result.title === 'string' && result.title.trim() && !shouldSkipStringTranslation(key, result.title.trim(), language)) {
                        result.title = translationMap.get(result.title.trim()) || result.title;
                    }
                    if (typeof result.text === 'string' && result.text.trim()) {
                        if (HTML_REGEX.test(result.text)) {
                            result.text = applyHtmlTranslations(result.text, translationMap, language, key);
                        } else if (!shouldSkipStringTranslation(key, result.text.trim(), language)) {
                            result.text = translationMap.get(result.text.trim()) || result.text;
                        }
                    }
                    if (typeof result.value === 'string' && result.value.trim()) {
                        if (HTML_REGEX.test(result.value)) {
                            result.value = applyHtmlTranslations(result.value, translationMap, language, key);
                        } else if (!shouldSkipStringTranslation(key, result.value.trim(), language)) {
                            result.value = translationMap.get(result.value.trim()) || result.value;
                        }
                    }
                    if (Array.isArray(result.values)) {
                        result.values = result.values.map((v: any) => {
                            if (typeof v !== 'string' || !v.trim()) return v;
                            if (HTML_REGEX.test(v)) {
                                return applyHtmlTranslations(v, translationMap, language, key);
                            }
                            if (!shouldSkipStringTranslation(key, v.trim(), language)) {
                                return translationMap.get(v.trim()) || v;
                            }
                            return v;
                        });
                    }
                    return result;
                });
                return JSON.stringify(translated);
            } catch (e) {
                return value;
            }
        }

        if (HTML_REGEX.test(value)) {
            return applyHtmlTranslations(value, translationMap, language, key);
        }

        const translatedVal = translationMap.get(trimmed);
        if (translatedVal) {
            const leadingWhitespace = value.match(/^\s*/)?.[0] || '';
            const trailingWhitespace = value.match(/\s*$/)?.[0] || '';
            return `${leadingWhitespace}${translatedVal}${trailingWhitespace}`;
        }
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((entry) => applyTranslations(entry, translationMap, language, key));
    }

    if (typeof value === 'object') {
        const result: Record<string, unknown> = {};
        Object.entries(value as Record<string, unknown>).forEach(([entryKey, entryValue]) => {
            result[entryKey] = applyTranslations(entryValue, translationMap, language, entryKey);
        });
        return result;
    }

    return value;
};

const translateResponseData = async (payload: unknown, language = 'en'): Promise<unknown> => {
    const collected = new Set<string>();
    collectTranslatableStrings(payload, language, '', collected);

    if (collected.size === 0) {
        return payload;
    }

    const uniqueStrings = Array.from(collected);
    const translatedStrings = await translateTexts(uniqueStrings, language);
    const translationMap = new Map(uniqueStrings.map((str, idx) => [str, translatedStrings[idx] || str]));

    return applyTranslations(payload, translationMap, language);
};

const REDIS_RESPONSE_CACHE_PREFIX = 'response_cache';
const REDIS_RESPONSE_CACHE_TTL = 86400;

const maybeTranslateApiPayload = async (req: Request, res: Response, payload: unknown, language = 'en'): Promise<unknown> => {
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

    const redisResponseKey = `${REDIS_RESPONSE_CACHE_PREFIX}::${normalizedLanguage}::${req.originalUrl || req.path || ''}`;
    if (redis) {
        try {
            const cachedResponse = await redis.get(redisResponseKey);
            if (cachedResponse) {
                const parsed = JSON.parse(cachedResponse as string);
                responseTranslationCache.set(cacheKey, parsed);
                trimResponseTranslationCache();
                res.setHeader(RESPONSE_TRANSLATED_HEADER, '1');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Vary', 'Accept-Encoding, x-translate-language');
                return parsed;
            }
        } catch (e: unknown) {
            logger.warn('[Auto-Translate] Redis response cache get failed:', (e as any).message || String(e));
        }
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Server translation timeout')), 60000);
        });

        const translated = await Promise.race([
            translateResponseData(payload, normalizedLanguage),
            timeoutPromise
        ]);
        clearTimeout(timeoutId);

        responseTranslationCache.set(cacheKey, translated);
        trimResponseTranslationCache();

        if (redis && translated) {
            redis.set(redisResponseKey, JSON.stringify(translated), { ex: REDIS_RESPONSE_CACHE_TTL })
                .catch((e: Error) => logger.warn('[Auto-Translate] Redis response cache set failed:', e.message));
        }

        res.setHeader(RESPONSE_TRANSLATED_HEADER, '1');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Vary', 'Accept-Encoding, x-translate-language');
        return translated;
    } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId);
        logger.warn(`[Auto-Translate] Falling back to original data for ${req.originalUrl || req.path} (${normalizedLanguage}) due to: ${(err as any).message || String(err)}`);
        return payload;
    }
};

const localizeDataObject = (data: unknown, language = 'en'): unknown => {
    if (data == null) return data;

    if (Array.isArray(data)) {
        return data.map(item => localizeDataObject(item, language));
    }

    if (typeof data === 'object') {
        const result = { ...(data as Record<string, unknown>) };
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

        Object.keys(result).forEach(key => {
            if (typeof result[key] === 'string' && (result[key] as string).trim()) {
                if (key !== 'details_json' && !key.endsWith('_url') && !SKIP_TRANSLATION_KEYS.has(key)) {
                    result[key] = applyGlossaryToText(result[key] as string, language);
                }
            }
        });

        return result;
    }

    if (typeof data === 'string') {
        return applyGlossaryToText(data, language);
    }

    return data;
};

const hasNonEnglishText = (value: unknown): boolean => {
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
        const values = Object.values(value as Record<string, unknown>);
        for (let i = 0; i < values.length; i++) {
            if (hasNonEnglishText(values[i])) return true;
        }
        return false;
    }
    return false;
};

const middleware = (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res) as (body: unknown) => Response;

    (res as any).json = (payload: unknown) => {
        const method = String(req.method || 'GET').toUpperCase();
        const fullPath = (req.originalUrl || '').split('?')[0];
        const isApiPath = fullPath.startsWith('/api/');
        const isTranslateEndpoint = fullPath === '/api/translate';

        if (method !== 'GET' || !isApiPath || isTranslateEndpoint) {
            return originalJson(payload);
        }

        if (res.locals.dataLocalized) {
            return originalJson(payload);
        }

        const language = (req.headers[LANGUAGE_HEADER] as string) || 'en';
        const targetLang = normalizeTargetLanguage(language);
        if (targetLang === 'en' && !hasNonEnglishText(payload)) {
            return originalJson(payload);
        }

        return Promise.resolve(maybeTranslateApiPayload(req, res, payload, language))
            .then((translatedPayload) => originalJson(translatedPayload))
            .catch((err: Error) => {
                console.warn(`[Auto-Translate] Error for ${fullPath}:`, err.message);
                return originalJson(payload);
            });
    };
    next();
};

const clearResponseCache = (resourcePrefix?: string): void => {
    if (resourcePrefix && ['en', 'bn', 'ko'].includes(resourcePrefix)) {
        const prefix = `${RESPONSE_TRANSLATION_CACHE_VERSION}::${resourcePrefix}::`;
        for (const key of responseTranslationCache.keys()) {
            if (key.startsWith(prefix)) {
                responseTranslationCache.delete(key);
            }
        }
        return;
    }

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

export = {
    middleware,
    localizeDataObject,
    clearResponseCache,
    translateResponseData,
    normalizeTargetLanguage,
    shouldServerTranslateResponse
};
