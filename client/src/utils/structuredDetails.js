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

export const extractStructuredPlainText = (value = '') => {
    if (!value) return '';
    if (!/<[a-z][\s\S]*>/i.test(value) || typeof window === 'undefined') {
        return normalizeStructuredText(value);
    }

    return normalizeStructuredText(new DOMParser().parseFromString(value, 'text/html').body.textContent || '');
};

const sanitizeHref = (href = '') => {
    const trimmed = href.trim();
    if (!trimmed) return '';
    if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
    if (trimmed.includes('@')) return `mailto:${trimmed}`;
    if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
    return '';
};

export const sanitizeStructuredInlineHtml = (html = '') => {
    if (!html) return '';
    if (!/<[a-z][\s\S]*>/i.test(html) || typeof window === 'undefined') {
        return escapeStructuredHtml(html);
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const serializeNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeStructuredHtml((node.textContent || '').replace(/\u00a0/g, ' '));
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
            const href = sanitizeHref(node.getAttribute('href') || node.textContent || '');
            if (!href) return children;
            return `<a href="${escapeStructuredHtml(href)}" target="_blank" rel="noopener noreferrer">${children}</a>`;
        }

        return children;
    };

    return Array.from(doc.body.childNodes).map(serializeNode).join('');
};

export const normalizeStructuredInlineHtml = (html = '') =>
    sanitizeStructuredInlineHtml(html)
        .replace(/(?:<br>){3,}/g, '<br><br>')
        .trim();

export const createStructuredDetail = (type = 'pair') => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    text: '',
    label: '',
    values: [''],
});

const parseLegacyLine = (text = '') => {
    const normalized = normalizeStructuredText(text);
    if (!normalized) return null;

    if (normalized.includes(':')) {
        const [rawLabel, ...rest] = normalized.split(':');
        return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: 'pair',
            text: '',
            label: rawLabel.trim(),
            values: [rest.join(':').trim()].filter(Boolean),
        };
    }

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'text',
        text: normalized,
        label: '',
        values: [''],
    };
};

export const parseStructuredDetails = (content = '') => {
    if (!content) return [];

    const trimmed = content.trim();

    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((item) => ({
                        id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        type: item.type === 'title' ? 'title' : item.type === 'pair' ? 'pair' : 'text',
                        text: item.text || '',
                        label: item.label || '',
                        values: Array.isArray(item.values) ? item.values : [item.value || ''],
                    }))
                    .filter((item) =>
                        item.type === 'pair'
                            ? item.label.trim() || item.values.some((value) => extractStructuredPlainText(value).trim())
                            : extractStructuredPlainText(item.text).trim()
                    );
            }
        } catch (err) {
            console.error('Failed to parse structured details:', err);
        }
    }

    if (/<[a-z][\s\S]*>/i.test(content) && typeof window !== 'undefined') {
        const doc = new DOMParser().parseFromString(content, 'text/html');
        const nodes = Array.from(doc.body.children);

        if (!nodes.length) {
            const fallback = parseLegacyLine(doc.body.textContent || '');
            return fallback ? [fallback] : [];
        }

        return nodes
            .flatMap((node) => {
                const tag = node.tagName.toLowerCase();

                if (tag === 'ul' || tag === 'ol') {
                    return Array.from(node.querySelectorAll(':scope > li'))
                        .map((listItem) => parseLegacyLine(listItem.textContent || ''))
                        .filter(Boolean);
                }

                if (/^h[1-6]$/.test(tag)) {
                    const headingText = normalizeStructuredText(node.textContent || '');
                    if (!headingText) return [];
                    return [{
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        type: 'title',
                        text: headingText,
                        label: '',
                        values: [''],
                    }];
                }

                const htmlValue = sanitizeStructuredInlineHtml(node.innerHTML || '');
                const textValue = extractStructuredPlainText(node.textContent || '');
                if (!textValue) return [];

                if (textValue.includes(':')) {
                    const [rawLabel, ...rest] = textValue.split(':');
                    return [{
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        type: 'pair',
                        text: '',
                        label: rawLabel.trim(),
                        values: [rest.join(':').trim()].filter(Boolean),
                    }];
                }

                return [{
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    type: 'text',
                    text: htmlValue || textValue,
                    label: '',
                    values: [''],
                }];
            })
            .filter(Boolean);
    }

    return content
        .split(content.includes('\n\n') ? '\n\n' : '\n')
        .map((line) => parseLegacyLine(line))
        .filter(Boolean);
};

export const serializeStructuredDetails = (items = []) =>
    JSON.stringify(
        items
            .map((item) => {
                if (item.type === 'title') {
                    const text = normalizeStructuredInlineHtml(item.text || '');
                    return extractStructuredPlainText(text) ? { type: 'title', text } : null;
                }

                if (item.type === 'text') {
                    const text = normalizeStructuredInlineHtml(item.text || '');
                    return extractStructuredPlainText(text) ? { type: 'text', text } : null;
                }

                const label = item.label?.trim() || '';
                const values = (item.values || [])
                    .map((value) => normalizeStructuredInlineHtml(value || ''))
                    .filter((value) => extractStructuredPlainText(value).trim());

                return label || values.length ? { type: 'pair', label, values } : null;
            })
            .filter(Boolean)
    );
