import fs = require('fs');
const logger = require('./utils/logger');
import path = require('path');
import crypto = require('crypto');
const { Redis } = require('@upstash/redis');
const db = require('./db');

let redis: any = null;
if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    try {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_URL,
            token: process.env.UPSTASH_REDIS_TOKEN
        });
        logger.info('[Auto-Translate] Upstash Redis client initialized successfully.');
    } catch (e: unknown) {
        logger.error({ err: e }, '[Auto-Translate] Failed to initialize Upstash Redis:', (e instanceof Error ? e.message : String(e)));
    }
} else {
    logger.warn('[Auto-Translate] Upstash Redis credentials not set. Falling back to local/memory cache.');
}


const CHUNK_SIZES: Record<string, Record<string, number>> = {
    'en': { 'bn': 3000, 'ko': 3000 },
    'bn': { 'en': 3000, 'ko': 3000 },
    'ko': { 'en': 3000, 'bn': 3000 },
};

const getMaxChunkSize = (sourceLang: string, targetLang: string): number => {
    return CHUNK_SIZES[sourceLang]?.[targetLang] ?? 3000;
};

let glossary: Record<string, Record<string, string>> = {};
try {
    glossary = require('./glossary.json');
} catch (e: unknown) {
    logger.warn('[Auto-Translate] Failed to require glossary:', (e instanceof Error ? e.message : String(e)));
}

let translator: any = null;
const translationCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 1000;
const CHUNK_CONCURRENCY = 10;
const CACHE_VERSION = 'v7';
const REDIS_RESPONSE_CACHE_PREFIX = 'response_cache';
const GOOGLE_TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
const LATIN_REGEX = /[A-Za-z]/;
const HTML_REGEX = /<[a-z][\s\S]*>/i;

const CACHE_FILE = path.join(__dirname, '.translation-cache.json');

if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const rawData = fs.readFileSync(CACHE_FILE, 'utf-8');
            const parsed = JSON.parse(rawData);
            Object.entries(parsed).forEach(([k, v]) => {
                if (typeof v === 'string') {
                    translationCache.set(k, v);
                }
            });
            logger.info(`[Auto-Translate] Loaded ${translationCache.size} persistent cache entries from disk.`);
        }
    } catch (e: unknown) {
        logger.warn('[Auto-Translate] Failed to load persistent translation cache:', (e instanceof Error ? e.message : String(e)));
    }
}

const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const saveCacheToDisk = debounce(() => {
    if (redis) return;
    try {
        const obj = Object.fromEntries(translationCache);
        fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e: unknown) {
        logger.warn('[Auto-Translate] Failed to save translation cache to disk:', (e instanceof Error ? e.message : String(e)));
    }
}, 5000);

const decodeHtmlEntities = (text = ''): string => {
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
        .replace(/&#(\d+);/g, (_match: string, dec: string) => String.fromCharCode(Number(dec)))
        .replace(/&#x([0-9a-f]+);/gi, (_match: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));
};

const getTranslator = async (): Promise<any> => {
    if (!translator) {
        const { default: translate } = await import('translate');
        translate.engine = 'google';
        translator = translate;
    }
    return translator;
};

const normalizeTargetLanguage = (language = 'en'): string => {
    if (language === 'bn') return 'bn';
    if (language === 'ko') return 'ko';
    return 'en';
};

const detectSourceLanguage = (text = '', targetLanguage = 'en'): string => {
    const sample = String(text || '');
    if (BANGLA_REGEX.test(sample)) return 'bn';
    if (HANGUL_REGEX.test(sample)) return 'ko';
    return 'en';
};

const needsTranslationForTarget = (text = '', targetLanguage = 'en'): boolean => {
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

const chunkTextByLength = (text = '', maxChars = 220): string[] => {
    const source = String(text || '');
    if (!source.trim() || source.length <= maxChars) {
        return [source];
    }

    const tokens = source.split(/(\s+)/).filter((token) => token !== '');
    const chunks: string[] = [];
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

interface Token {
    text: string;
    isSeparator: boolean;
}

const tokenizeSemantically = (text: string): Token[] => {
    const tokens: Token[] = [];
    const paragraphs = text.split(/(\r?\n\r?\n+)/);

    for (const para of paragraphs) {
        if (!para) continue;
        if (/^\r?\n\r?\n+$/.test(para)) {
            tokens.push({ text: para, isSeparator: true });
            continue;
        }

        let sentencesAndSep: string[];
        if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
            try {
                let locale = 'en';
                if (BANGLA_REGEX.test(para)) locale = 'bn';
                else if (HANGUL_REGEX.test(para)) locale = 'ko';

                const segmenter = new (Intl as any).Segmenter(locale, { granularity: 'sentence' });
                const segments = [...segmenter.segment(para)];
                sentencesAndSep = segments.map((seg: any) => seg.segment);
            } catch {
                sentencesAndSep = para.split(/(?<=[.!?\u0964])(\s+)/);
            }
        } else {
            sentencesAndSep = para.split(/(?<=[.!?\u0964])(\s+)/);
        }

        for (const item of sentencesAndSep) {
            if (!item) continue;
            if (/^\s+$/.test(item)) {
                tokens.push({ text: item, isSeparator: true });
                continue;
            }

            const clausesAndSep = item.split(/(?<=[,;:])(\s+)/);
            for (const subItem of clausesAndSep) {
                if (!subItem) continue;
                if (/^\s+$/.test(subItem)) {
                    tokens.push({ text: subItem, isSeparator: true });
                    continue;
                }

                tokens.push({ text: subItem, isSeparator: false });
            }
        }
    }

    return tokens;
};

const chunkTokens = (tokens: Token[], maxChars: number): Token[][] => {
    const chunks: Token[][] = [];
    let currentChunk: Token[] = [];
    let currentLen = 0;

    for (const token of tokens) {
        if (token.isSeparator) {
            if (currentChunk.length > 0) {
                currentChunk.push(token);
                currentLen += token.text.length;
            }
            continue;
        }

        const text = token.text;
        if (text.length > maxChars) {
            const wordTokens = text.split(/(\s+)/);
            for (const wt of wordTokens) {
                if (!wt) continue;
                const isSep = /^\s+$/.test(wt);

                if (isSep) {
                    if (currentChunk.length > 0) {
                        currentChunk.push({ text: wt, isSeparator: true });
                        currentLen += wt.length;
                    }
                } else {
                    if (wt.length > maxChars) {
                        let pos = 0;
                        while (pos < wt.length) {
                            const part = wt.slice(pos, pos + maxChars);
                            if (currentChunk.length > 0) {
                                chunks.push(currentChunk);
                                currentChunk = [];
                                currentLen = 0;
                            }
                            chunks.push([{ text: part, isSeparator: false }]);
                            pos += maxChars;
                        }
                    } else if (currentLen + wt.length > maxChars) {
                        if (currentChunk.length > 0) {
                            chunks.push(currentChunk);
                        }
                        currentChunk = [{ text: wt, isSeparator: false }];
                        currentLen = wt.length;
                    } else {
                        currentChunk.push({ text: wt, isSeparator: false });
                        currentLen += wt.length;
                    }
                }
            }
        } else if (currentLen + text.length > maxChars) {
            while (currentChunk.length > 0 && currentChunk[currentChunk.length - 1].isSeparator) {
                currentChunk.pop();
            }
            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
            }
            currentChunk = [token];
            currentLen = text.length;
        } else {
            currentChunk.push(token);
            currentLen += text.length;
        }
    }

    if (currentChunk.length > 0) {
        while (currentChunk.length > 0 && currentChunk[currentChunk.length - 1].isSeparator) {
            currentChunk.pop();
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }
    }

    return chunks;
};

interface ChunkWithOverlap {
    text: string;
    overlapPrefix: string | null;
}

const chunkWithOverlap = (text: string, maxChars: number, enableOverlap = true): ChunkWithOverlap[] => {
    const tokens = tokenizeSemantically(text);
    const chunks = chunkTokens(tokens, maxChars);

    const result: ChunkWithOverlap[] = [];
    for (let i = 0; i < chunks.length; i++) {
        const currentChunkTokens = chunks[i];
        let overlapPrefix: string | null = null;

        if (enableOverlap && i > 0) {
            const prevChunkTokens = chunks[i - 1];
            let lastNonSepIdx = -1;
            for (let j = prevChunkTokens.length - 1; j >= 0; j--) {
                if (!prevChunkTokens[j].isSeparator) {
                    lastNonSepIdx = j;
                    break;
                }
            }
            if (lastNonSepIdx !== -1) {
                overlapPrefix = prevChunkTokens[lastNonSepIdx].text;
            }
        }

        let chunkText = currentChunkTokens.map(t => t.text).join('');
        if (enableOverlap && overlapPrefix) {
            chunkText = overlapPrefix + " " + chunkText;
        }

        result.push({
            text: chunkText,
            overlapPrefix: overlapPrefix
        });
    }

    return result;
};

const splitForRetry = (text = '', maxChars = 220): string[] => {
    const normalized = String(text || '');
    if (normalized.length <= maxChars) {
        return [normalized];
    }

    const tokens = tokenizeSemantically(normalized);
    const chunks = chunkTokens(tokens, maxChars);
    return chunks.map(chunk => chunk.map(t => t.text).join(''));
};

const stripPrefix = (text: string, prefix: string): string => {
    if (!prefix || !text) return text;
    const cleanText = text.trim();
    const cleanPrefix = prefix.trim();
    if (cleanText.startsWith(cleanPrefix)) {
        return cleanText.slice(cleanPrefix.length).trim();
    }
    return cleanText;
};

const protectGlossary = (text: string, sourceLang: string, targetLang: string): { text: string; map: Record<string, string> } => {
    if (!text || typeof text !== 'string') return { text, map: {} };

    let processed = text;
    const map: Record<string, string> = {};
    let counter = 0;

    const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);

    for (const term of terms) {
        const replacement = glossary[term]?.[targetLang];
        if (!replacement) continue;

        let sourceText = term;
        if (sourceLang !== 'en') {
            sourceText = glossary[term]?.[sourceLang];
        }
        if (!sourceText) continue;

        const escaped = sourceText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regexStr = sourceLang === 'en' ? `\\b${escaped}\\b` : escaped;
        const regex = new RegExp(regexStr, 'gi');

        if (regex.test(processed)) {
            processed = processed.replace(regex, (match: string) => {
                const placeholder = `__GLOSS_${counter}__`;
                map[placeholder] = replacement;
                counter++;
                return placeholder;
            });
        }
    }

    return { text: processed, map };
};

const restoreGlossary = (text: string, map: Record<string, string>): string => {
    if (!text || typeof text !== 'string') return text;
    let processed = text;
    for (const [placeholder, replacement] of Object.entries(map)) {
        processed = processed.replace(new RegExp(placeholder, 'g'), replacement);
    }
    return processed;
};

const looksLikeBrokenTranslation = (translated = '', original = '', targetLanguage = 'en'): boolean => {
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

    if (targetLanguage === 'ko' && LATIN_REGEX.test(normalized) && !HANGUL_REGEX.test(normalized)) {
        return true;
    }

    return false;
};

const rateLimitState = {
    isPaused: false,
    consecutive429s: 0,
};

const backoffSchedule = [1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 60_000];

const handleRateLimit = async () => {
    rateLimitState.isPaused = true;
    rateLimitState.consecutive429s++;
    const idx = Math.min(rateLimitState.consecutive429s - 1, backoffSchedule.length - 1);
    const waitMs = backoffSchedule[idx] + Math.random() * 1000; // jitter
    logger.warn(`[Auto-Translate] Rate limited (429). Pausing translation workers and backing off for ${Math.round(waitMs)}ms.`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    rateLimitState.isPaused = false;
};

const waitIfRateLimited = async () => {
    while (rateLimitState.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }
};

const translateViaGoogleEndpoint = async (text = '', sourceLanguage = 'auto', targetLanguage = 'en'): Promise<string> => {
    const params = new URLSearchParams({
        client: 'gtx',
        sl: sourceLanguage || 'auto',
        tl: targetLanguage,
        dt: 't'
    });

    const body = new URLSearchParams({
        q: text
    });

    const response = await fetch(`${GOOGLE_TRANSLATE_ENDPOINT}?${params.toString()}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/x-www-form-urlencoded, application/json, text/plain, */*',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
    });

    if (!response.ok) {
        if (response.status === 429) {
            await handleRateLimit();
        }
        throw new Error(`Google translate endpoint failed with status ${response.status}`);
    }

    rateLimitState.consecutive429s = 0; // reset on success

    const payload = await response.json();
    if (!Array.isArray(payload?.[0])) {
        throw new Error('Unexpected translate payload shape');
    }

    return (payload[0] as any[])
        .map((part: any) => (Array.isArray(part) ? String(part[0] || '') : ''))
        .join('')
        .trim();
};

const translateWithFallbacks = async (text = '', sourceLanguage = 'auto', targetLanguage = 'en'): Promise<string> => {
    await waitIfRateLimited();
    try {
        const translated = await translateViaGoogleEndpoint(text, sourceLanguage, targetLanguage);
        if (!looksLikeBrokenTranslation(translated, text, targetLanguage)) {
            return translated;
        }
    } catch (error: unknown) {
        logger.warn('Google endpoint translation failed:', (error instanceof Error ? error.message : String(error)));
    }

    await waitIfRateLimited();
    try {
        const translate = await getTranslator();
        const translated = await translate(text, { from: sourceLanguage, to: targetLanguage });
        rateLimitState.consecutive429s = 0; // reset on success
        return translated || text;
    } catch (error: unknown) {
        logger.warn('Google library translation failed:', (error as any).message || String(error));
        if (((error as any).message || String(error))?.includes('429') || (error as any).status === 429) {
            await handleRateLimit();
        }
        return text;
    }
};

const getCacheKey = (text = '', targetLanguage = 'en', sourceLanguage = 'en'): string =>
    `${CACHE_VERSION}::${sourceLanguage}::${normalizeTargetLanguage(targetLanguage)}::${text}`;

const trimCache = (): void => {
    while (translationCache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = translationCache.keys().next().value;
        if (!oldestKey) break;
        translationCache.delete(oldestKey);
    }
};

const postProcessTranslation = (str: string, targetLanguage: string): string => {
    if (!str || targetLanguage !== 'bn') return str;
    const banglaDigits: Record<string, string> = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    const segments = str.split(/(<[^>]+>)/g);
    return segments.map((segment) => {
        if (!segment) return '';
        if (segment.startsWith('<')) return segment;
        const words = segment.split(/(\s+)/);
        return words.map((word) => {
            if (word.includes('@') && word.includes('.')) return word;
            if (word.startsWith('http://') || word.startsWith('https://') || word.startsWith('www.')) return word;
            return word.replace(/[0-9]/g, (w) => banglaDigits[w]);
        }).join('');
    }).join('');
};

const getHash = (text: string, lang: string): string => {
    return crypto.createHash('sha256')
        .update(text + lang)
        .digest('hex');
};

const getTranslationFromDB = async (hash: string, lang: string): Promise<string | null> => {
    const result = await db.query(
        'SELECT translated_text FROM translations WHERE source_hash = $1 AND target_lang = $2',
        [hash, lang]
    );
    return result.rows[0]?.translated_text || null;
};

const saveTranslationToDB = async (hash: string, source: string, lang: string, translated: string, isHtml: boolean): Promise<void> => {
    await db.query(
        `INSERT INTO translations (source_hash, source_text, target_lang, translated_text, is_html)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_hash, target_lang)
         DO UPDATE SET translated_text = EXCLUDED.translated_text, updated_at = NOW()
         WHERE translations.is_reviewed = false`,
        [hash, source, lang, translated, isHtml]
    );
};

const readCachedTranslation = async (text = '', targetLanguage = 'en', sourceLanguage = 'en'): Promise<string | null> => {
    const cleanText = (str: string) => str.replace(/<[^>]+>/g, '').replace(/[:.]/g, '').trim().toLowerCase();
    const cleaned = cleanText(text);
    if (cleaned === 'passing year') {
        const normTarget = normalizeTargetLanguage(targetLanguage);
        if (normTarget === 'bn') {
            const hasParagraph = text.toLowerCase().includes('<p>');
            return hasParagraph ? '<p>পাসের বছর</p>' : 'পাসের বছর';
        }
        if (normTarget === 'ko') {
            const hasParagraph = text.toLowerCase().includes('<p>');
            return hasParagraph ? '<p>졸업 연도</p>' : '졸업 연도';
        }
    }

    const key = getCacheKey(text, targetLanguage, sourceLanguage);

    // 1. Check LRU memory cache
    if (translationCache.has(key)) {
        const value = translationCache.get(key)!;
        translationCache.delete(key);
        translationCache.set(key, value);
        return postProcessTranslation(value, targetLanguage);
    }

    // 2. Check Postgres DB
    try {
        const normTarget = normalizeTargetLanguage(targetLanguage);
        const hash = getHash(text, normTarget);
        const dbValue = await getTranslationFromDB(hash, normTarget);
        if (dbValue) {
            translationCache.set(key, dbValue);
            trimCache();
            return postProcessTranslation(dbValue, targetLanguage);
        }
    } catch (e: unknown) {
        logger.warn('[Auto-Translate] Postgres translation lookup failed:', (e instanceof Error ? e.message : String(e)));
    }

    // 3. Check Redis (fallback)
    if (redis) {
        try {
            const value = await redis.get(key);
            if (value) {
                translationCache.set(key, value as string);
                trimCache();
                try {
                    const normTarget = normalizeTargetLanguage(targetLanguage);
                    const hash = getHash(text, normTarget);
                    const isHtml = HTML_REGEX.test(text);
                    await saveTranslationToDB(hash, text, normTarget, value as string, isHtml);
                } catch (dbErr: unknown) {
                    logger.warn('[Auto-Translate] Failed to backport Redis hit to Postgres:', (dbErr instanceof Error ? dbErr.message : String(dbErr)));
                }
                return postProcessTranslation(value as string, targetLanguage);
            }
        } catch (e: unknown) {
            logger.warn('[Auto-Translate] Redis get failed:', (e instanceof Error ? e.message : String(e)));
        }
    }

    return null;
};

type CacheReader = (text: string) => string | null | undefined;

const readCachedTranslations = async (texts: string[], targetLanguage: string, sourceLanguage: string): Promise<CacheReader> => {
    const keys = texts.map(t => getCacheKey(t, targetLanguage, sourceLanguage));
    const results = new Map<string, string>();

    const cleanText = (str: string) => str.replace(/<[^>]+>/g, '').replace(/[:.]/g, '').trim().toLowerCase();
    const l1MissItems: Array<{ text: string; key: string }> = [];

    for (let i = 0; i < keys.length; i++) {
        const text = texts[i];
        const key = keys[i];

        const cleaned = cleanText(text);
        if (cleaned === 'passing year') {
            const normTarget = normalizeTargetLanguage(targetLanguage);
            if (normTarget === 'bn') {
                const hasParagraph = text.toLowerCase().includes('<p>');
                results.set(text, hasParagraph ? '<p>পাসের বছর</p>' : 'পাসের বছর');
                continue;
            }
            if (normTarget === 'ko') {
                const hasParagraph = text.toLowerCase().includes('<p>');
                results.set(text, hasParagraph ? '<p>졸업 연도</p>' : '졸업 연도');
                continue;
            }
        }

        if (translationCache.has(key)) {
            const value = translationCache.get(key)!;
            translationCache.delete(key);
            translationCache.set(key, value);
            results.set(text, postProcessTranslation(value, targetLanguage));
        } else {
            l1MissItems.push({ text, key });
        }
    }

    if (l1MissItems.length > 0) {
        // 2. Batch check Postgres
        try {
            const normTarget = normalizeTargetLanguage(targetLanguage);
            const textHashMap = new Map<string, { text: string; key: string }>();
            l1MissItems.forEach(item => {
                const hash = getHash(item.text, normTarget);
                textHashMap.set(hash, item);
            });
            const hashes = Array.from(textHashMap.keys());

            if (hashes.length > 0) {
                const dbResults = await db.query(
                    'SELECT source_hash, translated_text FROM translations WHERE source_hash = ANY($1) AND target_lang = $2',
                    [hashes, normTarget]
                );

                dbResults.rows.forEach((row: { source_hash: string; translated_text: string }) => {
                    const item = textHashMap.get(row.source_hash);
                    if (item) {
                        translationCache.set(item.key, row.translated_text);
                        results.set(item.text, postProcessTranslation(row.translated_text, targetLanguage));
                        // remove from l1MissItems so we don't query Redis
                        const idx = l1MissItems.findIndex(m => m.key === item.key);
                        if (idx !== -1) l1MissItems.splice(idx, 1);
                    }
                });
            }
        } catch (e: unknown) {
            logger.warn('[Auto-Translate] Postgres batch lookup failed:', (e instanceof Error ? e.message : String(e)));
        }
    }

    if (redis && l1MissItems.length > 0) {
        try {
            const redisValues = await redis.mget(...l1MissItems.map(m => m.key));
            for (let i = 0; i < l1MissItems.length; i++) {
                const value = redisValues[i];
                if (value) {
                    const text = l1MissItems[i].text;
                    const key = l1MissItems[i].key;
                    translationCache.set(key, value as string);
                    results.set(text, postProcessTranslation(value as string, targetLanguage));

                    // Save to Postgres
                    try {
                        const normTarget = normalizeTargetLanguage(targetLanguage);
                        const hash = getHash(text, normTarget);
                        const isHtml = HTML_REGEX.test(text);
                        await saveTranslationToDB(hash, text, normTarget, value as string, isHtml);
                    } catch (dbErr: unknown) {
                        logger.warn('[Auto-Translate] Failed to backport Redis batch hit to Postgres:', (dbErr instanceof Error ? dbErr.message : String(dbErr)));
                    }
                }
            }
        } catch (e: unknown) {
            logger.warn('[Auto-Translate] Redis mget failed:', (e instanceof Error ? e.message : String(e)));
        }
    }

    return (text: string) => results.get(text) ?? null;
};

const writeCachedTranslation = async (text = '', targetLanguage = 'en', sourceLanguage = 'en', translated = ''): Promise<void> => {
    const key = getCacheKey(text, targetLanguage, sourceLanguage);

    translationCache.set(key, translated);
    trimCache();

    // 1. Save to Postgres
    try {
        const normTarget = normalizeTargetLanguage(targetLanguage);
        const hash = getHash(text, normTarget);
        const isHtml = HTML_REGEX.test(text);
        await saveTranslationToDB(hash, text, normTarget, translated, isHtml);
    } catch (e: unknown) {
        logger.warn('[Auto-Translate] Failed to save translation to Postgres:', (e instanceof Error ? e.message : String(e)));
    }

    if (!redis) {
        saveCacheToDisk();
    } else {
        try {
            await redis.set(key, translated, { ex: 604800 });
        } catch (e: unknown) {
            logger.warn('[Auto-Translate] Redis set failed:', (e instanceof Error ? e.message : String(e)));
        }
    }
};

const processWithConcurrency = async <T, R>(items: T[], concurrency: number, processor: (item: T, index: number) => Promise<R>): Promise<R[]> => {
    const limit = Math.max(1, concurrency);
    const results: R[] = new Array(items.length);
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

const translateOverlapPrefixes = async (chunks: ChunkWithOverlap[], sourceLanguage: string, targetLanguage: string): Promise<Map<string, string>> => {
    const prefixes = [...new Set(chunks.map(c => c.overlapPrefix).filter(Boolean))] as string[];
    const prefixMap = new Map<string, string>();
    if (prefixes.length === 0) return prefixMap;

    try {
        const translations = await translateTexts(prefixes, targetLanguage);
        prefixes.forEach((prefix, index) => {
            prefixMap.set(prefix, translations[index] || prefix);
        });
    } catch (err: unknown) {
        logger.warn(`[Auto-Translate] Batch translation of overlap prefixes failed: ${(err instanceof Error ? err.message : String(err))}. Prefix stripping may be degraded.`);
    }

    return prefixMap;
};

const translateChunksIndividually = async (chunks: ChunkWithOverlap[], sourceLanguage: string, targetLanguage: string, glossaryMap: Record<string, string>): Promise<string> => {
    const prefixMap = await translateOverlapPrefixes(chunks, sourceLanguage, targetLanguage);
    const translatedFragments = await processWithConcurrency(
        chunks,
        CHUNK_CONCURRENCY,
        async (chunk) => {
            try {
                let trans = await translateWithFallbacks(chunk.text, sourceLanguage, targetLanguage);
                if (chunk.overlapPrefix) {
                    const translatedPrefix = prefixMap.get(chunk.overlapPrefix);
                    if (translatedPrefix) {
                        trans = stripPrefix(trans, translatedPrefix);
                    }
                }
                return trans;
            } catch {
                return chunk.text;
            }
        }
    );

    const joined = translatedFragments.join(' ');
    const restored = restoreGlossary(joined, glossaryMap);
    return restored;
};

const translateText = async (text = '', language = 'en'): Promise<string> => {
    const targetLanguage = normalizeTargetLanguage(language);
    const sourceLanguage = detectSourceLanguage(text, targetLanguage);

    if (!text || !text.trim()) {
        return text;
    }

    const cleanText = (str: string) => str.replace(/<[^>]+>/g, '').replace(/[:.]/g, '').trim().toLowerCase();
    const cleaned = cleanText(text);
    if (cleaned === 'passing year') {
        if (targetLanguage === 'bn') {
            const hasParagraph = text.toLowerCase().includes('<p>');
            return hasParagraph ? '<p>পাসের বছর</p>' : 'পাসের বছর';
        }
        if (targetLanguage === 'ko') {
            const hasParagraph = text.toLowerCase().includes('<p>');
            return hasParagraph ? '<p>졸업 연도</p>' : '졸업 연도';
        }
    }

    if (!needsTranslationForTarget(text, targetLanguage) || sourceLanguage === targetLanguage) {
        return text;
    }

    const cached = await readCachedTranslation(text, targetLanguage, sourceLanguage);
    if (cached != null) {
        return cached;
    }

    try {
        const { text: protectedText, map: glossaryMap } = protectGlossary(text, sourceLanguage, targetLanguage);
        const maxChars = getMaxChunkSize(sourceLanguage, targetLanguage);
        const useOverlap = sourceLanguage !== 'ko' && targetLanguage !== 'ko';
        const chunks = chunkWithOverlap(protectedText, maxChars, useOverlap);

        let resolved: string;
        if (chunks.length === 1) {
            try {
                const translatedChunk = await translateWithFallbacks(chunks[0].text, sourceLanguage, targetLanguage);
                resolved = restoreGlossary(translatedChunk, glossaryMap);
            } catch {
                resolved = text;
            }
        } else {
            const hasHtml = chunks.some(c => HTML_REGEX.test(c.text));
            const joinedChunks = chunks.map(c => c.text).join('\n');
            if (!hasHtml && joinedChunks.length <= 4000) {
                try {
                    const prefixMap = await translateOverlapPrefixes(chunks, sourceLanguage, targetLanguage);
                    const translatedJoined = await translateWithFallbacks(joinedChunks, sourceLanguage, targetLanguage);
                    const translatedFragments = translatedJoined.split('\n').map(s => s.trim());

                    if (translatedFragments.length === chunks.length) {
                        const assembledFragments: string[] = [];
                        for (let i = 0; i < chunks.length; i++) {
                            const chunk = chunks[i];
                            let fragmentTrans = translatedFragments[i];

                            if (chunk.overlapPrefix) {
                                const translatedPrefix = prefixMap.get(chunk.overlapPrefix);
                                if (translatedPrefix) {
                                    fragmentTrans = stripPrefix(fragmentTrans, translatedPrefix);
                                }
                            }
                            assembledFragments.push(fragmentTrans);
                        }

                        resolved = assembledFragments.join(' ');
                        resolved = restoreGlossary(resolved, glossaryMap);
                    } else {
                        logger.warn(`[Auto-Translate] Batch length mismatch (${translatedFragments.length} vs ${chunks.length}). Retrying individually.`);
                        resolved = await translateChunksIndividually(chunks, sourceLanguage, targetLanguage, glossaryMap);
                    }
                } catch (err: unknown) {
                    logger.warn(`[Auto-Translate] Batch translation failed: ${(err instanceof Error ? err.message : String(err))}. Retrying individually.`);
                    resolved = await translateChunksIndividually(chunks, sourceLanguage, targetLanguage, glossaryMap);
                }
            } else {
                resolved = await translateChunksIndividually(chunks, sourceLanguage, targetLanguage, glossaryMap);
            }
        }

        if (!looksLikeBrokenTranslation(resolved, text, targetLanguage)) {
            await writeCachedTranslation(text, targetLanguage, sourceLanguage, resolved);
        }

        return postProcessTranslation(decodeHtmlEntities(resolved), targetLanguage);
    } catch (error: unknown) {
        logger.error({ err: error }, `Translation proxy failed:`, (error as any).message || String(error));
        return text;
    }
};

const translateTexts = async (texts: string[] = [], language = 'en'): Promise<string[]> => {
    if (!texts || texts.length === 0) return [];

    const targetLanguage = normalizeTargetLanguage(language);
    const normalizedTexts = texts.map((text) => String(text || ''));
    const uniqueTexts = [...new Set(normalizedTexts)];

    const sourceLanguageGroups: Record<string, string[]> = {};
    for (const text of uniqueTexts) {
        if (!needsTranslationForTarget(text, targetLanguage)) continue;
        const sourceLanguage = detectSourceLanguage(text, targetLanguage);
        if (sourceLanguage === targetLanguage) continue;

        if (!sourceLanguageGroups[sourceLanguage]) {
            sourceLanguageGroups[sourceLanguage] = [];
        }
        sourceLanguageGroups[sourceLanguage].push(text);
    }

    const cacheReaders: Record<string, CacheReader> = {};
    const unresolved: string[] = [];

    await Promise.all(Object.entries(sourceLanguageGroups).map(async ([sourceLanguage, groupTexts]) => {
        const reader = await readCachedTranslations(groupTexts, targetLanguage, sourceLanguage);
        cacheReaders[sourceLanguage] = reader;

        for (const text of groupTexts) {
            if (reader(text) == null) {
                unresolved.push(text);
            }
        }
    }));

    if (unresolved.length > 0) {
        const groups: Record<string, string[]> = {};
        for (const text of unresolved) {
            const sourceLanguage = detectSourceLanguage(text, targetLanguage);
            const groupKey = `${sourceLanguage}::${targetLanguage}`;
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(text);
        }

        const BATCH_SIZE = 50;
        for (const [groupKey, groupTexts] of Object.entries(groups)) {
            const [sourceLanguage, targetLanguage] = groupKey.split('::');
            const batches: string[][] = [];
            for (let i = 0; i < groupTexts.length; i += BATCH_SIZE) {
                batches.push(groupTexts.slice(i, i + BATCH_SIZE));
            }

            await processWithConcurrency(
                batches,
                CHUNK_CONCURRENCY,
                async (batch) => {
                    const hasHtml = batch.some(t => HTML_REGEX.test(t));
                    if (hasHtml) {
                        await Promise.all(batch.map(t => translateText(t, language)));
                        return;
                    }

                    const protectedBatches = batch.map(t => protectGlossary(t, sourceLanguage, targetLanguage));
                    const joinedText = protectedBatches.map(pb => pb.text).join('\n');

                    try {
                        const translatedJoined = await translateWithFallbacks(joinedText, sourceLanguage, targetLanguage);
                        const translatedParts = translatedJoined.split('\n').map(s => s.trim());

                        if (translatedParts.length === batch.length) {
                            for (let i = 0; i < batch.length; i++) {
                                const original = batch[i];
                                const translatedPart = restoreGlossary(translatedParts[i], protectedBatches[i].map);
                                if (!looksLikeBrokenTranslation(translatedPart, original, targetLanguage)) {
                                    await writeCachedTranslation(original, targetLanguage, sourceLanguage, translatedPart);
                                }
                            }
                        } else {
                            await Promise.all(batch.map(t => translateText(t, language)));
                        }
                    } catch (err: unknown) {
                        logger.warn(`[Auto-Translate] Batch translateTexts failed: ${(err instanceof Error ? err.message : String(err))}. Falling back to individual.`);
                        await Promise.all(batch.map(t => translateText(t, language)));
                    }
                }
            );
        }
    }

    return Promise.all(normalizedTexts.map(async (text) => {
        if (!needsTranslationForTarget(text, targetLanguage)) return text;
        const sourceLanguage = detectSourceLanguage(text, targetLanguage);
        if (sourceLanguage === targetLanguage) return text;

        const cached = await readCachedTranslation(text, targetLanguage, sourceLanguage);
        return decodeHtmlEntities(cached != null ? cached : text);
    }));
};

const getAllCachedTranslations = async (): Promise<Array<{ key: string; id: number; version: string; sourceLang: string; targetLang: string; originalText: string; translatedText: string; is_reviewed: boolean }>> => {
    try {
        const result = await db.query(
            'SELECT id, source_text, target_lang, translated_text, is_reviewed, is_html FROM translations ORDER BY updated_at DESC'
        );
        return result.rows.map((row: any) => {
            const sourceLang = detectSourceLanguage(row.source_text, row.target_lang);
            const key = `v7::${sourceLang}::${row.target_lang}::${row.id}`;
            return {
                key: key,
                id: row.id,
                version: 'v7',
                sourceLang,
                targetLang: row.target_lang,
                originalText: row.source_text,
                translatedText: row.translated_text,
                is_reviewed: !!row.is_reviewed
            };
        });
    } catch (e: unknown) {
        logger.error({ err: e }, '[Auto-Translate] Failed to query all translations from database:', (e instanceof Error ? e.message : String(e)));
        return [];
    }
};

const updateCachedTranslation = async (keyOrId: string, translatedText: string): Promise<void> => {
    let id: number | null = null;
    if (/^\d+$/.test(keyOrId)) {
        id = parseInt(keyOrId);
    } else {
        const parts = keyOrId.split('::');
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
            id = parseInt(lastPart);
        }
    }

    if (id !== null) {
        try {
            await db.query(
                'UPDATE translations SET translated_text = $1, updated_at = NOW() WHERE id = $2',
                [translatedText, id]
            );
            translationCache.clear();
        } catch (e: unknown) {
            logger.error({ err: e }, '[Auto-Translate] Failed to update translation in Postgres:', (e instanceof Error ? e.message : String(e)));
        }
    } else {
        logger.warn('[Auto-Translate] Update key was not numeric:', keyOrId);
    }
};

const deleteCachedTranslation = async (keyOrId: string): Promise<void> => {
    let id: number | null = null;
    if (/^\d+$/.test(keyOrId)) {
        id = parseInt(keyOrId);
    } else {
        const parts = keyOrId.split('::');
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
            id = parseInt(lastPart);
        }
    }

    if (id !== null) {
        try {
            await db.query('DELETE FROM translations WHERE id = $1', [id]);
            translationCache.clear();
        } catch (e: unknown) {
            logger.error({ err: e }, '[Auto-Translate] Failed to delete translation in Postgres:', (e instanceof Error ? e.message : String(e)));
        }
    } else {
        logger.warn('[Auto-Translate] Delete key was not numeric:', keyOrId);
    }
};

const getCacheStats = (): { l1Size: number; maxEntries: number; redisConnected: boolean } => {
    return {
        l1Size: translationCache.size,
        maxEntries: MAX_CACHE_ENTRIES,
        redisConnected: !!redis
    };
};

const clearRedisResponseCache = async (language?: string): Promise<void> => {
    if (!redis || !language) return;
    try {
        const keys = await redis.keys(`${REDIS_RESPONSE_CACHE_PREFIX}::${language}::*`);
        if (keys && keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (e: unknown) {
        logger.warn('[Auto-Translate] Failed to clear Redis response cache:', (e instanceof Error ? e.message : String(e)));
    }
};

export = {
    redis,
    clearRedisResponseCache,
    translateText,
    translateTexts,
    getAllCachedTranslations,
    updateCachedTranslation,
    deleteCachedTranslation,
    getCacheStats,
    tokenizeSemantically,
    chunkTokens,
    chunkWithOverlap,
    protectGlossary,
    restoreGlossary
};
