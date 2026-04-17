const axios = require('axios');

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const MAX_TRANSLATE_CHARS = 4000;
const translationCache = new Map();
const PROTECTED_TOKEN_REGEX = /((?:https?:\/\/|www\.)[^\s<>"')]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})(?=[\s<>"')]|$)/g;
const BANGLA_REGEX = /[\u0980-\u09FF]/;
const HANGUL_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;

const normalizeTargetLanguage = (language = 'en') => {
    if (language === 'bn') return 'bn';
    if (language === 'ko') return 'ko';
    return 'en';
};

const isLikelyAlreadyInTargetLanguage = (text = '', language = 'en') => {
    const trimmed = text.trim();
    if (!trimmed) return true;

    if (language === 'bn') {
        return BANGLA_REGEX.test(trimmed);
    }

    if (language === 'ko') {
        return HANGUL_REGEX.test(trimmed);
    }

    return !BANGLA_REGEX.test(trimmed) && !HANGUL_REGEX.test(trimmed);
};

const splitText = (text = '', maxLength = MAX_TRANSLATE_CHARS) => {
    if (text.length <= maxLength) return [text];

    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = Math.min(start + maxLength, text.length);

        if (end < text.length) {
            const lastBreak = Math.max(
                text.lastIndexOf('. ', end),
                text.lastIndexOf('! ', end),
                text.lastIndexOf('? ', end),
                text.lastIndexOf('\n', end),
                text.lastIndexOf(' ', end)
            );

            if (lastBreak > start + 100) {
                end = lastBreak + 1;
            }
        }

        chunks.push(text.slice(start, end));
        start = end;
    }

    return chunks.filter(Boolean);
};

const protectTokens = (text = '') => {
    const tokens = [];

    const protectedText = text.replace(PROTECTED_TOKEN_REGEX, (match) => {
        const placeholder = `__PORTFOLIO_TOKEN_${tokens.length}__`;
        tokens.push(match);
        return placeholder;
    });

    return { protectedText, tokens };
};

const restoreTokens = (text = '', tokens = []) =>
    tokens.reduce(
        (result, token, index) => result.replaceAll(`__PORTFOLIO_TOKEN_${index}__`, token),
        text
    );

const fetchTranslatedChunk = async (text, targetLanguage) => {
    const params = {
        client: 'gtx',
        sl: 'auto',
        tl: targetLanguage,
        dt: 't'
    };

    const response = await axios.post(TRANSLATE_ENDPOINT, `q=${encodeURIComponent(text)}`, {
        params,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
    });

    const segments = Array.isArray(response.data?.[0]) ? response.data[0] : [];
    return segments.map((segment) => segment?.[0] || '').join('');
};

const translateText = async (text = '', language = 'en') => {
    const targetLanguage = normalizeTargetLanguage(language);
    console.log(`Translating "${text}" to "${targetLanguage}"`);
    if (!text || !text.trim() || isLikelyAlreadyInTargetLanguage(text, targetLanguage)) {
        return text;
    }

    const cacheKey = `${targetLanguage}::${text}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }

    const translationPromise = (async () => {
        try {
            const { protectedText, tokens } = protectTokens(text);
            const chunks = splitText(protectedText);
            const translatedChunks = [];

            for (const chunk of chunks) {
                translatedChunks.push(await fetchTranslatedChunk(chunk, targetLanguage));
            }

            return restoreTokens(translatedChunks.join(''), tokens);
        } catch (error) {
            console.error(`Translation failed for ${targetLanguage}:`, error.message);
            return text;
        }
    })();

    translationCache.set(cacheKey, translationPromise);
    return translationPromise;
};

const translateTexts = async (texts = [], language = 'en') => {
    if (!texts || texts.length === 0) return [];
    
    const results = new Array(texts.length);
    const DELIMITER = ' [[]] ';
    const MAX_BLOCK_CHARS = 3500;
    
    let currentBlock = [];
    let currentBlockIndices = [];
    let currentBlockLength = 0;
    
    const processBlock = async (block, indices) => {
        if (!block.length) return;
        try {
            const joinedText = block.join(DELIMITER);
            const translatedJoined = await translateText(joinedText, language);
            const parts = translatedJoined.split(/\[\[\s*\]\]|\[\]/); // Handle potential spaces added by translate
            
            indices.forEach((originalIndex, i) => {
                results[originalIndex] = (parts[i] || block[i]).trim();
            });
        } catch (error) {
            console.error('Block translation failed:', error);
            indices.forEach((originalIndex, i) => {
                results[originalIndex] = block[i];
            });
        }
    };
    
    for (let i = 0; i < texts.length; i++) {
        const text = String(texts[i] || '').trim();
        if (!text) {
            results[i] = texts[i];
            continue;
        }
        
        if (currentBlockLength + text.length + DELIMITER.length > MAX_BLOCK_CHARS) {
            await processBlock(currentBlock, currentBlockIndices);
            await new Promise(resolve => setTimeout(resolve, 400)); // Delay between blocks
            currentBlock = [];
            currentBlockIndices = [];
            currentBlockLength = 0;
        }
        
        currentBlock.push(text);
        currentBlockIndices.push(i);
        currentBlockLength += text.length + DELIMITER.length;
    }
    
    await processBlock(currentBlock, currentBlockIndices);
    return results;
};

module.exports = {
    translateText,
    translateTexts
};
