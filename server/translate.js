const axios = require('axios');

const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

const normalizeTargetLanguage = (language = 'en') => {
    if (language === 'bn') return 'bn';
    if (language === 'ko') return 'ko';
    return 'en';
};

const fetchTranslatedChunk = async (text, targetLanguage) => {
    const params = {
        client: 'gtx',
        sl: 'auto',
        tl: targetLanguage,
        dt: 't',
        q: text
    };

    const response = await axios.get(TRANSLATE_ENDPOINT, {
        params,
        timeout: 25000
    });

    const segments = Array.isArray(response.data?.[0]) ? response.data[0] : [];
    return segments.map((segment) => segment?.[0] || '').join('');
};

/**
 * Single-string translation proxy. 
 * Optimized for speed and low CPU usage on Cloudflare Workers.
 */
const translateText = async (text = '', language = 'en') => {
    const targetLanguage = normalizeTargetLanguage(language);
    
    if (!text || !text.trim()) {
        return text;
    }

    try {
        // We no longer protect tokens here to save CPU. 
        // Simple sentences usually don't contain complex tokens.
        return await fetchTranslatedChunk(text, targetLanguage);
    } catch (error) {
        console.error(`Translation proxy failed:`, error.message);
        return text;
    }
};

/**
 * Batch translation proxy.
 * Processes small batches incoming from the frontend.
 */
const translateTexts = async (texts = [], language = 'en') => {
    if (!texts || texts.length === 0) return [];
    
    // Process in parallel since strings are now small sentences
    return Promise.all(
        texts.map(text => translateText(String(text || ''), language))
    );
};

module.exports = {
    translateText,
    translateTexts
};
