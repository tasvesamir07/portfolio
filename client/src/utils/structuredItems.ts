import type { StructuredItem, StructuredItemType } from '../types';
import DOMPurify from 'dompurify';

const createId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createStructuredItem = (type: StructuredItemType = 'pair'): StructuredItem => ({
  id: createId(),
  type,
  title: '',
  values: [''],
  text: ''
});

export const normalizeStructuredText = (value = ''): string =>
  value
    .replace(/\u00a0/g, ' ')
    .trim();

export const escapeStructuredHtml = (value = ''): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const decodeStructuredHtmlEntities = (value = ''): string => {
  if (!value) return '';

  const decodeOnce = (input = ''): string => {
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
  for (let i = 0; i < 3; i += 1) {
    const nextDecoded = decodeOnce(decoded);
    if (nextDecoded === decoded) break;
    decoded = nextDecoded;
  }

  return decoded.replace(/\u00a0/g, ' ');
};

export const extractStructuredPlainText = (value = ''): string => {
  if (!value) return '';
  if (!/<[a-z][\s\S]*>/i.test(value) || typeof window === 'undefined') {
    return normalizeStructuredText(decodeStructuredHtmlEntities(value));
  }
  return normalizeStructuredText(new DOMParser().parseFromString(value, 'text/html').body.textContent || '');
};

export const sanitizeStructuredInlineHtml = (html = ''): string => {
  if (!html) return '';
  if (!/<[a-z][\s\S]*>/i.test(html) || typeof window === 'undefined') {
    return escapeStructuredHtml(decodeStructuredHtmlEntities(html));
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const normalizeHref = (value = ''): string => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) return trimmed;
    if (trimmed.includes('@')) return `mailto:${trimmed}`;
    return `https://${trimmed.replace(/^\/+/, '')}`;
  };

  const serializeNode = (node: ChildNode): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeStructuredHtml(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const children = Array.from(node.childNodes).map(serializeNode).join('');
    const tag = (node as Element).tagName.toLowerCase();

    const style = (node as Element).getAttribute('style');
    const sanitizedStyle = style ? (DOMPurify.sanitize(`<div style="${style}"></div>`).match(/style="([^"]*)"/)?.[1] || '') : '';
    const styleAttr = sanitizedStyle ? ` style="${escapeStructuredHtml(sanitizedStyle)}"` : '';

    if (tag === 'span') {
      if (style) return `<span${styleAttr}>${children}</span>`;
      return children;
    }
    if (tag === 'strong' || tag === 'b') return `<strong${styleAttr}>${children}</strong>`;
    if (tag === 'em' || tag === 'i') return `<em${styleAttr}>${children}</em>`;
    if (tag === 'br') return '<br>';
    if (tag === 'div' || tag === 'p' || tag === 'li') {
      return children ? `${children}<br>` : '<br>';
    }
    if (tag === 'a') {
      const href = normalizeHref((node as Element).getAttribute('href') || (node as Element).textContent || '');
      return href ? `<a href="${escapeStructuredHtml(href)}" target="_blank" rel="noopener noreferrer"${styleAttr}>${children || escapeStructuredHtml((node as Element).textContent || href)}</a>` : children;
    }

    return children;
  };

  return Array.from(doc.body.childNodes)
    .map(serializeNode)
    .join('')
    .replace(/\u200B/g, '')
    .replace(/(?:<br>\s*){3,}/g, '<br><br>')
    .replace(/^(?:<br>\s*)+|(?:<br>\s*)+$/g, '');
};

interface ParsedItem {
  id: string;
  type: StructuredItemType;
  title: string;
  values: string[];
  text: string;
}

const parseFallbackPair = (text = '', html = ''): ParsedItem | null => {
  const normalized = normalizeStructuredText(text);
  if (!normalized.includes(':')) return null;

  const [rawTitle, ...rest] = normalized.split(':');
  if (!rawTitle) return null;
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

const parseFallbackNode = (html = '', tagName = ''): ParsedItem | null => {
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

export const parseStructuredItems = (content = ''): StructuredItem[] => {
  if (!content) return [];

  const trimmed = content.trim();

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: Record<string, unknown>) => {
            const type: StructuredItemType = item.type === 'title' ? 'title' : item.type === 'text' ? 'text' : 'pair';

            if (type === 'title') {
              const title = normalizeStructuredText(String(item.title || item.text || ''));
              return title ? { id: String(item.id || createId()), type, title: String(title), values: [''], text: '' } : null;
            }

            if (type === 'text') {
              const text = sanitizeStructuredInlineHtml(String(item.text || ''));
              return extractStructuredPlainText(text)
                ? { id: String(item.id || createId()), type, title: '', values: [''], text }
                : null;
            }

            const title = normalizeStructuredText(String(item.title || ''));
            const values = (Array.isArray(item.values) ? item.values : [item.value || ''])
              .map((value: unknown) => sanitizeStructuredInlineHtml(String(value || '')))
              .filter((value: string) => extractStructuredPlainText(value));

            return title || values.length
              ? { id: String(item.id || createId()), type, title, values: values.length ? values : [''], text: '' }
              : null;
          })
          .filter(Boolean) as StructuredItem[];
      }
    } catch {
      console.error('Failed to parse structured items JSON');
    }
  }

  if (!/<[a-z][\s\S]*>/i.test(content) || typeof window === 'undefined') {
    return content
      .split(content.includes('\n\n') ? /\n\s*\n/ : /\n+/)
      .map((part) => parseFallbackNode(part))
      .filter(Boolean) as StructuredItem[];
  }

  const doc = new DOMParser().parseFromString(content, 'text/html');
  const children = Array.from(doc.body.children);
  const blocks: StructuredItem[] = [];

  children.forEach((element) => {
    const tag = element.tagName.toLowerCase();

    if (tag === 'ul' || tag === 'ol') {
      Array.from(element.querySelectorAll(':scope > li'))
        .map((li) => parseFallbackNode(li.innerHTML || li.textContent || '', 'li'))
        .filter(Boolean)
        .forEach((item) => blocks.push(item!));
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

export const serializeStructuredItems = (items: StructuredItem[] = []): string =>
  JSON.stringify(
    items
      .map((item) => {
        const type: StructuredItemType = item.type === 'title' ? 'title' : item.type === 'text' ? 'text' : 'pair';

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

export const buildStructuredPreview = (content = ''): string =>
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

export const buildStructuredFallbackText = (items: StructuredItem[] = []): string =>
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
