const fs = require('fs');
const path = require('path');
const { Redis } = require('@upstash/redis');

let redis = null;
if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    try {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_URL,
            token: process.env.UPSTASH_REDIS_TOKEN
        });
        console.log('[Auto-Translate] Upstash Redis client initialized successfully.');
    } catch (e) {
        console.error('[Auto-Translate] Failed to initialize Upstash Redis:', e.message);
    }
} else {
    console.warn('[Auto-Translate] Upstash Redis credentials not set. Falling back to local/memory cache.');
}

const CHUNK_SIZES = {
  'en': { 'bn': 280, 'ko': 250 },   // source → target max chars
  'bn': { 'en': 400, 'ko': 250 },
  'ko': { 'en': 280, 'bn': 200 },
};

const getMaxChunkSize = (sourceLang, targetLang) => {
    return CHUNK_SIZES[sourceLang]?.[targetLang] ?? 220;
};

let glossary = {};
try {
    const glossaryPath = path.join(__dirname, 'glossary.json');
    if (fs.existsSync(glossaryPath)) {
        glossary = JSON.parse(fs.readFileSync(glossaryPath, 'utf-8'));
    }
} catch (e) {
    console.warn('[Auto-Translate] Failed to load glossary:', e.message);
}

let translator = null;
const translationCache = new Map();
const MAX_CACHE_ENTRIES = 6000;
const CHUNK_CONCURRENCY = 8;
const CACHE_VERSION = 'v7';
const REDIS_RESPONSE_CACHE_PREFIX = 'response_cache';
const GOOGLE_TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
const LATIN_REGEX = /[A-Za-z]/;
const HTML_REGEX = /<[a-z][\s\S]*>/i;

const CACHE_FILE = path.join(__dirname, '.translation-cache.json');

// On startup, load cache from disk if Redis is not used
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
            console.log(`[Auto-Translate] Loaded ${translationCache.size} persistent cache entries from disk.`);
        }
    } catch (e) {
        console.warn('[Auto-Translate] Failed to load persistent translation cache:', e.message);
    }
}

// Debounce helper to prevent excessive disk writes
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const saveCacheToDisk = debounce(() => {
    if (redis) return;
    try {
        const obj = Object.fromEntries(translationCache);
        fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
        console.warn('[Auto-Translate] Failed to save translation cache to disk:', e.message);
    }
}, 5000);

/**
 * Decodes common HTML entities that might be returned by the translation service.
 */
const decodeHtmlEntities = (text = '') => {
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
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
};

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

const chunkTextByLength = (text = '', maxChars = 220) => {
    const source = String(text || '');
    if (!source.trim() || source.length <= maxChars) {
        return [source];
    }

    const tokens = source.split(/(\s+)/).filter((token) => token !== '');
    const chunks = [];
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

const tokenizeSemantically = (text) => {
    const tokens = [];
    const paragraphs = text.split(/(\r?\n\r?\n+)/);
    
    for (const para of paragraphs) {
        if (!para) continue;
        if (/^\r?\n\r?\n+$/.test(para)) {
            tokens.push({ text: para, isSeparator: true });
            continue;
        }
        
        let sentencesAndSep;
        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            try {
                let locale = 'en';
                if (BANGLA_REGEX.test(para)) locale = 'bn';
                else if (HANGUL_REGEX.test(para)) locale = 'ko';
                
                const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
                const segments = [...segmenter.segment(para)];
                sentencesAndSep = [];
                for (const seg of segments) {
                    sentencesAndSep.push(seg.segment);
                }
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

const chunkTokens = (tokens, maxChars) => {
    const chunks = [];
    let currentChunk = [];
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

const chunkWithOverlap = (text, maxChars, enableOverlap = true) => {
    const tokens = tokenizeSemantically(text);
    const chunks = chunkTokens(tokens, maxChars);
    
    const result = [];
    for (let i = 0; i < chunks.length; i++) {
        const currentChunkTokens = chunks[i];
        let overlapPrefix = null;
        
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

const splitForRetry = (text = '', maxChars = 220) => {
    const normalized = String(text || '');
    if (normalized.length <= maxChars) {
        return [normalized];
    }
    
    const tokens = tokenizeSemantically(normalized);
    const chunks = chunkTokens(tokens, maxChars);
    return chunks.map(chunk => chunk.map(t => t.text).join(''));
};

const stripPrefix = (text, prefix) => {
    if (!prefix || !text) return text;
    const cleanText = text.trim();
    const cleanPrefix = prefix.trim();
    if (cleanText.startsWith(cleanPrefix)) {
        return cleanText.slice(cleanPrefix.length).trim();
    }
    return cleanText;
};

const protectGlossary = (text, sourceLang, targetLang) => {
    if (!text || typeof text !== 'string') return { text, map: {} };
    
    let processed = text;
    const map = {};
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
            processed = processed.replace(regex, (match) => {
                const placeholder = `__GLOSS_${counter}__`;
                map[placeholder] = replacement;
                counter++;
                return placeholder;
            });
        }
    }
    
    return { text: processed, map };
};

const restoreGlossary = (text, map) => {
    if (!text || typeof text !== 'string') return text;
    let processed = text;
    for (const [placeholder, replacement] of Object.entries(map)) {
        processed = processed.replace(new RegExp(placeholder, 'g'), replacement);
    }
    return processed;
};

const looksLikeBrokenTranslation = (translated = '', original = '', targetLanguage = 'en') => {
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

const postProcessTranslation = (str, targetLanguage) => {
    if (!str || targetLanguage !== 'bn') return str;
    const banglaDigits = {'0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'};
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

const readCachedTranslation = async (text = '', targetLanguage = 'en', sourceLanguage = 'en') => {
    const cleanText = (str) => str.replace(/<[^>]+>/g, '').replace(/[:.]/g, '').trim().toLowerCase();
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
    
    // 1. Check L1 in-memory Map
    if (translationCache.has(key)) {
        const value = translationCache.get(key);
        // Refresh insertion order for basic LRU behavior.
        translationCache.delete(key);
        translationCache.set(key, value);
        return postProcessTranslation(value, targetLanguage);
    }

    // 2. Check L2 Redis Cache
    if (redis) {
        try {
            const value = await redis.get(key);
            if (value) {
                // Populate L1 cache
                translationCache.set(key, value);
                trimCache();
                return postProcessTranslation(value, targetLanguage);
            }
        } catch (e) {
            console.warn('[Auto-Translate] Redis get failed:', e.message);
        }
    }

    return null;
};

const readCachedTranslations = async (texts, targetLanguage, sourceLanguage) => {
    const keys = texts.map(t => getCacheKey(t, targetLanguage, sourceLanguage));
    const results = new Map();
    
    const cleanText = (str) => str.replace(/<[^>]+>/g, '').replace(/[:.]/g, '').trim().toLowerCase();
    const l1MissKeys = [];
    
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
            const value = translationCache.get(key);
            translationCache.delete(key);
            translationCache.set(key, value);
            results.set(text, postProcessTranslation(value, targetLanguage));
        } else {
            l1MissKeys.push({ text, key });
        }
    }
    
    if (redis && l1MissKeys.length > 0) {
        try {
            const redisValues = await redis.mget(...l1MissKeys.map(m => m.key));
            for (let i = 0; i < l1MissKeys.length; i++) {
                const value = redisValues[i];
                if (value) {
                    translationCache.set(l1MissKeys[i].key, value);
                    results.set(l1MissKeys[i].text, postProcessTranslation(value, targetLanguage));
                }
            }
        } catch (e) {
            console.warn('[Auto-Translate] Redis mget failed:', e.message);
        }
    }
    
    return (text) => results.get(text) ?? null;
};

const writeCachedTranslation = async (text = '', targetLanguage = 'en', sourceLanguage = 'en', translated = '') => {
    const key = getCacheKey(text, targetLanguage, sourceLanguage);
    
    // 1. Write to L1 in-memory Map
    translationCache.set(key, translated);
    trimCache();
    if (!redis) {
        saveCacheToDisk();
    }

    // 2. Write to L2 Redis Cache
    if (redis) {
        try {
            // Set with 7-day TTL (7 * 24 * 3600 = 604800 seconds)
            await redis.set(key, translated, { ex: 604800 });
        } catch (e) {
            console.warn('[Auto-Translate] Redis set failed:', e.message);
        }
    }
};

/**
 * Concurrency control pool helper to process items in parallel up to limit.
 */
const processWithConcurrency = async (items, concurrency, processor) => {
    const limit = Math.max(1, concurrency);
    const results = new Array(items.length);
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

/**
 * Single-string translation proxy. 
 * Now uses the 'translate' package for more robust processing.
 */
const translateOverlapPrefixes = async (chunks, sourceLanguage, targetLanguage) => {
    const prefixes = [...new Set(chunks.map(c => c.overlapPrefix).filter(Boolean))];
    const prefixMap = new Map();
    if (prefixes.length === 0) return prefixMap;

    try {
        const translations = await translateTexts(prefixes, targetLanguage);
        prefixes.forEach((prefix, index) => {
            prefixMap.set(prefix, translations[index] || prefix);
        });
    } catch (err) {
        console.warn(`[Auto-Translate] Batch translation of overlap prefixes failed: ${err.message}. Prefix stripping may be degraded.`);
    }

    return prefixMap;
};

const translateChunksIndividually = async (chunks, sourceLanguage, targetLanguage, glossaryMap) => {
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

const translateText = async (text = '', language = 'en') => {
    const targetLanguage = normalizeTargetLanguage(language);
    const sourceLanguage = detectSourceLanguage(text, targetLanguage);
    
    if (!text || !text.trim()) {
        return text;
    }

    const cleanText = (str) => str.replace(/<[^>]+>/g, '').replace(/[:.]/g, '').trim().toLowerCase();
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
        
        let resolved;
        if (chunks.length === 1) {
            try {
                const translatedChunk = await translateWithFallbacks(chunks[0].text, sourceLanguage, targetLanguage);
                resolved = restoreGlossary(translatedChunk, glossaryMap);
            } catch {
                resolved = text;
            }
        } else {
            const hasHtml = chunks.some(c => HTML_REGEX.test(c.text));
            if (!hasHtml) {
                const joinedChunks = chunks.map(c => c.text).join('\n');
                try {
                    const prefixMap = await translateOverlapPrefixes(chunks, sourceLanguage, targetLanguage);
                    const translatedJoined = await translateWithFallbacks(joinedChunks, sourceLanguage, targetLanguage);
                    const translatedFragments = translatedJoined.split('\n').map(s => s.trim());
                    
                    if (translatedFragments.length === chunks.length) {
                        const assembledFragments = [];
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
                        console.warn(`[Auto-Translate] Batch length mismatch (${translatedFragments.length} vs ${chunks.length}). Retrying individually.`);
                        resolved = await translateChunksIndividually(chunks, sourceLanguage, targetLanguage, glossaryMap);
                    }
                } catch (err) {
                    console.warn(`[Auto-Translate] Batch translation failed: ${err.message}. Retrying individually.`);
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
    } catch (error) {
        console.error(`Translation proxy failed:`, error.message);
        return text;
    }
};

const translateTexts = async (texts = [], language = 'en') => {
    if (!texts || texts.length === 0) return [];

    const targetLanguage = normalizeTargetLanguage(language);
    const normalizedTexts = texts.map((text) => String(text || ''));
    const uniqueTexts = [...new Set(normalizedTexts)];
    
    const sourceLanguageGroups = {};
    for (const text of uniqueTexts) {
        if (!needsTranslationForTarget(text, targetLanguage)) continue;
        const sourceLanguage = detectSourceLanguage(text, targetLanguage);
        if (sourceLanguage === targetLanguage) continue;
        
        if (!sourceLanguageGroups[sourceLanguage]) {
            sourceLanguageGroups[sourceLanguage] = [];
        }
        sourceLanguageGroups[sourceLanguage].push(text);
    }
    
    const cacheReaders = {};
    const unresolved = [];
    
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
        const groups = {};
        for (const text of unresolved) {
            const sourceLanguage = detectSourceLanguage(text, targetLanguage);
            const groupKey = `${sourceLanguage}::${targetLanguage}`;
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(text);
        }
        
        const BATCH_SIZE = 10;
        for (const [groupKey, groupTexts] of Object.entries(groups)) {
            const [sourceLanguage, targetLanguage] = groupKey.split('::');
            const batches = [];
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
                    } catch (err) {
                        console.warn(`[Auto-Translate] Batch translateTexts failed: ${err.message}. Falling back to individual.`);
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
        
        const cached = cacheReaders[sourceLanguage]?.(text);
        return decodeHtmlEntities(cached != null ? cached : text);
    }));
};

const getAllCachedTranslations = async () => {
    const items = [];
    if (redis) {
        try {
            const keys = await redis.keys(`${CACHE_VERSION}::*`);
            if (keys && keys.length > 0) {
                for (let i = 0; i < keys.length; i += 100) {
                    const chunkKeys = keys.slice(i, i + 100);
                    const values = await Promise.all(chunkKeys.map(k => redis.get(k)));
                    chunkKeys.forEach((key, idx) => {
                        if (values[idx]) {
                            items.push({ key, value: values[idx] });
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('[Auto-Translate] Redis keys/get failed in getAllCachedTranslations:', e.message);
        }
    }
    
    const mapEntries = Array.from(translationCache.entries());
    mapEntries.forEach(([key, value]) => {
        if (!items.find(item => item.key === key)) {
            items.push({ key, value });
        }
    });
    
    return items.map(item => {
        const parts = item.key.split('::');
        const version = parts[0];
        const sourceLang = parts[1] || 'en';
        const targetLang = parts[2] || 'en';
        const originalText = parts.slice(3).join('::');
        return {
            key: item.key,
            version,
            sourceLang,
            targetLang,
            originalText,
            translatedText: item.value
        };
    });
};

const updateCachedTranslation = async (key, translatedText) => {
    translationCache.set(key, translatedText);
    if (!redis) {
        saveCacheToDisk();
    } else {
        try {
            await redis.set(key, translatedText);
        } catch (e) {
            console.warn('[Auto-Translate] Redis set failed in updateCachedTranslation:', e.message);
        }
    }
};

const deleteCachedTranslation = async (key) => {
    translationCache.delete(key);
    if (!redis) {
        saveCacheToDisk();
    } else {
        try {
            await redis.del(key);
        } catch (e) {
            console.warn('[Auto-Translate] Redis del failed in deleteCachedTranslation:', e.message);
        }
    }
};

const getCacheStats = () => {
    return {
        l1Size: translationCache.size,
        maxEntries: MAX_CACHE_ENTRIES,
        redisConnected: !!redis
    };
};

const clearRedisResponseCache = async (language) => {
    if (!redis || !language) return;
    try {
        const keys = await redis.keys(`${REDIS_RESPONSE_CACHE_PREFIX}::${language}::*`);
        if (keys && keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (e) {
        console.warn('[Auto-Translate] Failed to clear Redis response cache:', e.message);
    }
};

module.exports = {
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
