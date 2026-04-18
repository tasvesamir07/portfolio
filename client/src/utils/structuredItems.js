import { useState, useEffect, useRef } from 'react';
import { shouldRunLiveClientTranslation, translateText } from '../i18n/translator';

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createStructuredItem = (type = 'pair') => ({
    id: createId(),
    type,
    title: '',
    values: [''],
    text: ''
});

export const normalizeStructuredText = (value = '') =>
    value
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

export const escapeStructuredHtml = (value = '') =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const decodeStructuredHtmlEntities = (value = '') => {
    if (!value) return '';

    const decodeOnce = (input = '') => {
        if (typeof window === 'undefined') {
            return input
                .replace(/&nbsp;/gi, ' ')
                .replace(/&#39;/gi, "'")
                .replace(/&quot;/gi, '"')
                .replace(/&lt;/gi, '<')
                .replace(/&gt;/gi, '>')
                .replace(/&amp;/gi, '&');
        }

        return new DOMParser().parseFromString(input, 'text/html').body.textContent || '';
    };

    let decoded = String(value);

    // Old saved records may already contain double-escaped entities like &amp;amp;.
    // Decode a few passes so re-opening and re-saving does not keep mutating the text.
    for (let i = 0; i < 3; i += 1) {
        const nextDecoded = decodeOnce(decoded);
        if (nextDecoded === decoded) break;
        decoded = nextDecoded;
    }

    return decoded.replace(/\u00a0/g, ' ');
};

export const extractStructuredPlainText = (value = '') => {
    if (!value) return '';

    if (!/<[a-z][\s\S]*>/i.test(value) || typeof window === 'undefined') {
        return normalizeStructuredText(decodeStructuredHtmlEntities(value));
    }

    return normalizeStructuredText(new DOMParser().parseFromString(value, 'text/html').body.textContent || '');
};

export const sanitizeStructuredInlineHtml = (html = '') => {
    if (!html) return '';

    if (!/<[a-z][\s\S]*>/i.test(html) || typeof window === 'undefined') {
        return escapeStructuredHtml(decodeStructuredHtmlEntities(html));
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const normalizeHref = (value = '') => {
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) return trimmed;
        if (trimmed.includes('@')) return `mailto:${trimmed}`;
        return `https://${trimmed.replace(/^\/+/, '')}`;
    };

    const serializeNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeStructuredHtml(node.textContent || '');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const children = Array.from(node.childNodes).map(serializeNode).join('');
        const tag = node.tagName.toLowerCase();

        if (tag === 'strong' || tag === 'b') return `<strong>${children}</strong>`;
        if (tag === 'em' || tag === 'i') return `<em>${children}</em>`;
        if (tag === 'br') return '<br>';
        if (tag === 'a') {
            const href = normalizeHref(node.getAttribute('href') || node.textContent || '');
            return href ? `<a href="${escapeStructuredHtml(href)}" target="_blank" rel="noopener noreferrer">${children || escapeStructuredHtml(node.textContent || href)}</a>` : children;
        }

        return children;
    };

    return Array.from(doc.body.childNodes).map(serializeNode).join('').trim();
};

const parseFallbackPair = (text = '', html = '') => {
    const normalized = normalizeStructuredText(text);
    if (!normalized.includes(':')) return null;

    const [rawTitle, ...rest] = normalized.split(':');
    const title = rawTitle.trim();
    const valueText = rest.join(':').trim();

    if (!title || !valueText) return null;

    return {
        id: createId(),
        type: 'pair',
        title,
        values: [sanitizeStructuredInlineHtml(html || valueText)],
        text: ''
    };
};

const parseFallbackNode = (html = '', tagName = '') => {
    const plainText = extractStructuredPlainText(html);
    if (!plainText) return null;

    if (/^h[1-6]$/i.test(tagName)) {
        return {
            id: createId(),
            type: 'title',
            title: plainText,
            values: [''],
            text: ''
        };
    }

    const pairItem = parseFallbackPair(plainText, html);
    if (pairItem) return pairItem;

    return {
        id: createId(),
        type: 'text',
        title: '',
        values: [''],
        text: sanitizeStructuredInlineHtml(html || plainText)
    };
};

export const parseStructuredItems = (content = '') => {
    if (!content) return [];

    const trimmed = content.trim();

    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((item) => {
                        const type = item.type === 'title' ? 'title' : item.type === 'text' ? 'text' : 'pair';

                        if (type === 'title') {
                            const title = normalizeStructuredText(item.title || item.text || '');
                            return title ? { id: item.id || createId(), type, title, values: [''], text: '' } : null;
                        }

                        if (type === 'text') {
                            const text = sanitizeStructuredInlineHtml(item.text || '');
                            return extractStructuredPlainText(text)
                                ? { id: item.id || createId(), type, title: '', values: [''], text }
                                : null;
                        }

                        const title = normalizeStructuredText(item.title || '');
                        const values = (Array.isArray(item.values) ? item.values : [item.value || ''])
                            .map((value) => sanitizeStructuredInlineHtml(value || ''))
                            .filter((value) => extractStructuredPlainText(value));

                        return title || values.length
                            ? { id: item.id || createId(), type, title, values: values.length ? values : [''], text: '' }
                            : null;
                    })
                    .filter(Boolean);
            }
        } catch (err) {
            console.error('Failed to parse structured items JSON:', err);
        }
    }

    if (!/<[a-z][\s\S]*>/i.test(content) || typeof window === 'undefined') {
        return content
            .split(content.includes('\n\n') ? /\n\s*\n/ : /\n+/)
            .map((part) => parseFallbackNode(part))
            .filter(Boolean);
    }

    const doc = new DOMParser().parseFromString(content, 'text/html');
    const children = Array.from(doc.body.children);
    const blocks = [];

    children.forEach((element) => {
        const tag = element.tagName.toLowerCase();

        if (tag === 'ul' || tag === 'ol') {
            Array.from(element.querySelectorAll(':scope > li'))
                .map((li) => parseFallbackNode(li.innerHTML || li.textContent || '', 'li'))
                .filter(Boolean)
                .forEach((item) => blocks.push(item));
            return;
        }

        const parsed = parseFallbackNode(element.innerHTML || element.textContent || '', tag);
        if (parsed) {
            blocks.push(parsed);
        }
    });

    if (blocks.length) {
        return blocks;
    }

    const fallback = parseFallbackNode(doc.body.innerHTML || doc.body.textContent || '');
    return fallback ? [fallback] : [];
};

export const serializeStructuredItems = (items = []) =>
    JSON.stringify(
        items
            .map((item) => {
                const type = item.type === 'title' ? 'title' : item.type === 'text' ? 'text' : 'pair';

                if (type === 'title') {
                    const title = normalizeStructuredText(item.title || '');
                    return title ? { type, title } : null;
                }

                if (type === 'text') {
                    const text = sanitizeStructuredInlineHtml(item.text || '');
                    return extractStructuredPlainText(text) ? { type, text } : null;
                }

                const title = normalizeStructuredText(item.title || '');
                const values = (item.values || [])
                    .map((value) => sanitizeStructuredInlineHtml(value || ''))
                    .filter((value) => extractStructuredPlainText(value));

                return title || values.length ? { type, title, values } : null;
            })
            .filter(Boolean)
    );

export const buildStructuredPreview = (content = '') =>
    parseStructuredItems(content)
        .map((item) => {
            if (item.type === 'title') return item.title;
            if (item.type === 'text') return extractStructuredPlainText(item.text || '');

            const values = (item.values || []).map((value) => extractStructuredPlainText(value)).filter(Boolean).join(' | ');
            return item.title ? `${item.title}: ${values}` : values;
        })
        .filter(Boolean)
        .join(' ')
        .trim();

export const buildStructuredFallbackText = (items = []) =>
    items
        .flatMap((item) => {
            if (item.type === 'text') {
                const text = extractStructuredPlainText(item.text || '');
                return text ? [text] : [];
            }

            if (item.type === 'pair') {
                const values = (item.values || [])
                    .map((value) => extractStructuredPlainText(value))
                    .filter(Boolean);
                return values.length ? values : (item.title ? [item.title] : []);
            }

            return item.title ? [item.title] : [];
        })
        .filter(Boolean)
        .join(', ');

/**
 * Universal hook: takes a list of parsed structured items and translates every
 * text/title/value string in batch. Returns translated items reactively.
 * 
 * Usage:  const translatedItems = useTranslatedStructuredItems(parsedItems, language);
 */
export const useTranslatedStructuredItems = (items, language, options = {}) => {
    const [translated, setTranslated] = useState(items);
    const keyRef = useRef(null);
    const force = options?.force === true;

    useEffect(() => {
        if (!items?.length || (!force && !shouldRunLiveClientTranslation())) {
            setTranslated(items);
            return;
        }

        // Build a flat list of every string that needs translating with its location
        const jobs = [];
        items.forEach((item, i) => {
            if (item.title) jobs.push({ i, field: 'title', text: extractStructuredPlainText(item.title) });
            if (item.text) jobs.push({ i, field: 'text', text: extractStructuredPlainText(item.text) });
            if (Array.isArray(item.values)) {
                item.values.forEach((v, vi) => {
                    const plain = extractStructuredPlainText(v);
                    if (plain) jobs.push({ i, field: 'values', vi, text: plain });
                });
            }
        });

        const key = `${language}::${JSON.stringify(jobs.map(j => j.text))}`;
        if (keyRef.current === key) return;
        keyRef.current = key;

        setTranslated(items); // show originals while loading

        Promise.all(jobs.map(j => translateText(j.text, language))).then(results => {
            // Deep-clone items and patch translated strings back in
            const next = items.map(item => ({ ...item, values: item.values ? [...item.values] : [] }));
            results.forEach((result, idx) => {
                const { i, field, vi } = jobs[idx];
                if (field === 'title') next[i].title = result;
                else if (field === 'text') next[i].text = result;
                else if (field === 'values') next[i].values[vi] = result;
            });
            setTranslated(next);
        }).catch(() => setTranslated(items));
    }, [language, JSON.stringify(items?.map(it => ({ t: it.title, x: it.text, v: it.values }))), force]);

    return translated;
};
