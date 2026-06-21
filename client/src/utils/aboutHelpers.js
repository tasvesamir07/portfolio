import {
    normalizeStructuredText as normalizeText,
    extractStructuredPlainText as extractPlainText,
    sanitizeStructuredInlineHtml as sanitizeInlineHtml
} from './structuredItems';

export const isHTML = (str) => /<[a-z][\s\S]*>/i.test(str);

export const isContactLabel = (label = '') => {
    const normalized = label.trim().toLowerCase();
    return normalized.includes('email')
        || normalized.includes('website')
        || normalized.includes('이메일')
        || normalized.includes('웹사이트')
        || normalized.includes('ইমেইল')
        || normalized.includes('ওয়েবসাইট')
        || normalized.includes('ওয়াইবসাইট');
};

export const looksLikeContact = (value = '') => /@|(?:https?:\/\/|www\.)/i.test(value);

export const toHref = (value) => {
    if (!value) return '#';
    if (value.includes('@') && !value.startsWith('mailto:')) {
        return `mailto:${value}`;
    }
    if (!/^https?:\/\//i.test(value)) {
        return `https://${value}`;
    }
    return value;
};

export const splitContactValues = (value = '') => {
    const normalizedValue = normalizeText(value)
        .replace(/([A-Za-z0-9.-]+\.[A-Za-z]{2,})(?=[A-Za-z0-9._%+-]+@)/g, '$1 ')
        .replace(/((?:https?:\/\/|www\.)[^\s]+)(?=(?:https?:\/\/|www\.))/gi, '$1 ');

    const emails = normalizedValue.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
    const urls = normalizedValue.match(/(?:https?:\/\/|www\.)[^\s]+/gi) || [];
    const detectedValues = [...emails, ...urls];

    if (detectedValues.length > 0) {
        return [...new Set(detectedValues)];
    }

    return normalizedValue
        .split(/\s*(?:,|;)\s*|\s+(?=\S+@\S+)|\s+(?=https?:\/\/|www\.)/g)
        .map((item) => item.trim())
        .filter(Boolean);
};

export const extractHighlights = (content = '') => {
    if (!content) return [];

    const trimmed = content.trim();

    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((item) => {
                        if (item.type === 'text') {
                            return {
                                kind: 'text',
                                textHtml: sanitizeInlineHtml(item.text || ''),
                                text: extractPlainText(item.text || ''),
                                linkedValues: []
                            };
                        }

                        const title = normalizeText(item.title || '');
                        const values = Array.isArray(item.values)
                            ? item.values.map((value) => ({
                                html: sanitizeInlineHtml(value),
                                text: extractPlainText(value)
                            })).filter((value) => value.text)
                            : [{ html: sanitizeInlineHtml(item.value || ''), text: extractPlainText(item.value || '') }].filter((value) => value.text);
                        const value = values.map((itemValue) => itemValue.text).join(' ');
                        const linkedValues = isContactLabel(title) || looksLikeContact(value)
                            ? (values.length ? values.map((itemValue) => itemValue.text) : splitContactValues(value))
                            : [];

                        return {
                            kind: 'pair',
                            label: title,
                            valueHtmls: values.map((itemValue) => itemValue.html),
                            text: title ? `${title}: ${value}` : value,
                            linkedValues
                        };
                    })
                    .filter((item) => item.text);
            }
        } catch (err) {
            console.error('Failed to parse highlight JSON:', err);
        }
    }

    if (!isHTML(content)) {
        return content
            .split(content.includes('\n\n') ? '\n\n' : '\n')
            .map((point) => ({
                text: normalizeText(point),
                linkedValues: []
            }))
            .filter((item) => item.text);
    }

    if (typeof DOMParser === 'undefined') {
        return [{ text: normalizeText(content), linkedValues: [] }].filter((item) => item.text);
    }

    const doc = new DOMParser().parseFromString(content, 'text/html');
    const listItems = Array.from(doc.body.querySelectorAll('li'));
    const sourceNodes = listItems.length ? listItems : Array.from(doc.body.children);

    return sourceNodes
        .map((node) => {
            const text = normalizeText(node.textContent || '');
            const linkedValues = Array.from(node.querySelectorAll('a'))
                .map((anchor) => normalizeText(anchor.textContent || anchor.getAttribute('href') || ''))
                .filter(Boolean);

            return {
                text,
                linkedValues: [...new Set(linkedValues)]
            };
        })
        .filter((item) => item.text);
};

export const extractBioBlocks = (content = '') => {
    if (!content) return [];

    if (!isHTML(content)) {
        return content
            .split(/\n\s*\n/)
            .map((paragraph) => normalizeText(paragraph))
            .filter(Boolean)
            .map((text) => ({ type: 'paragraph', text }));
    }

    if (typeof DOMParser === 'undefined') {
        return [{ type: 'paragraph', text: normalizeText(content) }].filter((block) => block.text);
    }

    const doc = new DOMParser().parseFromString(content, 'text/html');
    const children = Array.from(doc.body.children);
    const blocks = [];

    children.forEach((element) => {
        const tag = element.tagName.toLowerCase();

        if (tag === 'ul' || tag === 'ol') {
            const items = Array.from(element.querySelectorAll(':scope > li'))
                .map((item) => normalizeText(item.textContent || ''))
                .filter(Boolean);

            if (items.length) {
                blocks.push({ type: tag, items });
            }
            return;
        }

        const text = normalizeText(element.textContent || '');
        if (text) {
            blocks.push({ type: 'paragraph', text });
        }
    });

    if (!blocks.length) {
        const fallbackText = normalizeText(doc.body.textContent || '');
        if (fallbackText) {
            blocks.push({ type: 'paragraph', text: fallbackText });
        }
    }

    return blocks;
};
