import {
  normalizeStructuredText as normalizeText,
  extractStructuredPlainText as extractPlainText,
  sanitizeStructuredInlineHtml as sanitizeInlineHtml
} from './structuredItems';
import type { HighlightItem, BioBlock, ContactValue } from '../types';

export const isHTML = (str: string): boolean => /<[a-z][\s\S]*>/i.test(str);

export const isContactLabel = (label = ''): boolean => {
  const normalized = label.trim().toLowerCase();
  return normalized.includes('email')
    || normalized.includes('website')
    || normalized.includes('이메일')
    || normalized.includes('웹사이트')
    || normalized.includes('ইমেইল')
    || normalized.includes('ওয়েবসাইট')
    || normalized.includes('ওয়াইবসাইট');
};

export const looksLikeContact = (value = ''): boolean => /@|(?:https?:\/\/|www\.)/i.test(value);

export const toHref = (value: string): string => {
  if (!value) return '#';
  if (value.includes('@') && !value.startsWith('mailto:')) {
    return `mailto:${value}`;
  }
  if (!/^https?:\/\//i.test(value)) {
    return `https://${value}`;
  }
  return value;
};

export const splitContactValues = (value = ''): string[] => {
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

export const extractHighlights = (content = ''): HighlightItem[] => {
  if (!content) return [];

  const trimmed = content.trim();

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: Record<string, unknown>): HighlightItem | null => {
            if (item.type === 'text') {
              const text = extractPlainText(String(item.text || ''));
              if (!text) return null;
              return {
                kind: 'text',
                textHtml: sanitizeInlineHtml(String(item.text || '')),
                text,
                linkedValues: []
              };
            }

            const title = normalizeText(String(item.title || ''));
            const rawValues: unknown[] = Array.isArray(item.values) ? item.values : [item.value || ''];
            const values: ContactValue[] = rawValues
              .map((v: unknown) => ({
                html: sanitizeInlineHtml(String(v || '')),
                text: extractPlainText(String(v || ''))
              }))
              .filter((v) => v.text);

            const value = values.map((v: ContactValue) => v.text).join(' ');
            const linkedValues: string[] = isContactLabel(title) || looksLikeContact(value)
              ? (values.length ? values.map((v: ContactValue) => v.text) : splitContactValues(value))
              : [];

            return {
              kind: 'pair',
              label: title,
              valueHtmls: values.map((v: ContactValue) => v.html),
              text: title ? `${title}: ${value}` : value,
              linkedValues
            };
          })
          .filter(Boolean) as HighlightItem[];
      }
    } catch {
      console.error('Failed to parse highlight JSON');
    }
  }

  if (!isHTML(content)) {
    return content
      .split(content.includes('\n\n') ? '\n\n' : '\n')
      .map((point): HighlightItem => ({
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
      } as HighlightItem;
    })
    .filter((item) => item.text);
};

export const extractBioBlocks = (content = ''): BioBlock[] => {
  if (!content) return [];

  if (!isHTML(content)) {
    return content
      .split(/\n\s*\n/)
      .map((paragraph) => normalizeText(paragraph))
      .filter(Boolean)
      .map((text) => ({ type: 'paragraph' as const, text }));
  }

  if (typeof DOMParser === 'undefined') {
    return [{ type: 'paragraph' as const, text: normalizeText(content) }].filter((block) => block.text);
  }

  const doc = new DOMParser().parseFromString(content, 'text/html');
  const children = Array.from(doc.body.children);
  const blocks: BioBlock[] = [];

  children.forEach((element) => {
    const tag = element.tagName.toLowerCase();

    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(element.querySelectorAll(':scope > li'))
        .map((item) => normalizeText(item.textContent || ''))
        .filter(Boolean);

      if (items.length) {
        blocks.push({ type: tag as 'ul' | 'ol', items });
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
