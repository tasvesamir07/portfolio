// @ts-nocheck
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Plus, Trash2, FileText, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../../../api';
import { createStructuredItem } from '../../../utils/structuredItems';

export const MAX_UPLOAD_SIZE_MB = 4;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const getAcceptedFileLabel = (accept = 'image/*') => {
    if (!accept || accept === 'image/*') return 'Images only';

    return accept
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            if (part === 'image/*') return 'Images';
            return part.replace(/^\./, '').toUpperCase();
        })
        .join(', ');
};

export const formatUploadErrorMessage = (error: unknown): string => {
    if (error?.response?.status === 413) {
        return `File is too large. Maximum upload size is ${MAX_UPLOAD_SIZE_MB} MB.`;
    }

    const responseError = error?.response?.data?.error;
    if (typeof responseError === 'string' && responseError.trim()) {
        return responseError;
    }

    const responseMessage = error?.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
        return responseMessage;
    }

    if (typeof error?.message === 'string' && error.message.trim() && error.message !== 'Network Error') {
        return error.message;
    }

    return 'Upload failed. Please try again with a smaller file.';
};

export const uploadFileToMediaApi = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post('/upload', formData);
    return res.data.url;
};

export const parseHighlightItems = (content = ''): HighlightItemData[] => {
    if (!content) return [];

    const trimmed = content.trim();

    if (trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((item) => ({
                        id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        type: item.type === 'text' ? 'text' : 'pair',
                        title: item.title || '',
                        values: Array.isArray(item.values) ? item.values : [item.value || ''],
                        text: item.text || ''
                    }))
                    .filter((item) => item.type === 'text' ? extractPlainText(item.text).trim() : (item.title.trim() || item.values.some((value) => extractPlainText(value).trim())));
            }
        } catch (err) {
            console.error('Failed to parse saved highlight items:', err);
        }
    }

    let points = [];

    if (/<[a-z][\s\S]*>/i.test(content) && typeof window !== 'undefined') {
        const doc = new DOMParser().parseFromString(content, 'text/html');
        const listItems = Array.from(doc.body.querySelectorAll('li'));
        const sourceNodes = listItems.length ? listItems : Array.from(doc.body.children);
        points = sourceNodes
            .map((node) => normalizeHighlightText(node.textContent || ''))
            .filter(Boolean);
    } else {
        points = content
            .split(content.includes('\n\n') ? '\n\n' : '\n')
            .map((point) => normalizeHighlightText(point))
            .filter(Boolean);
    }

    return points.map((point) => {
        if (point.includes(':')) {
            const [rawTitle, ...rest] = point.split(':');
            return {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                type: 'pair',
                title: rawTitle.trim(),
                values: rest.join(':').split(/\n+/).map((value) => value.trim()).filter(Boolean).length
                    ? rest.join(':').split(/\n+/).map((value) => value.trim()).filter(Boolean)
                    : [rest.join(':').trim()],
                text: ''
            };
        }

        return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: 'text',
            title: '',
            values: [''],
            text: point
        };
    });
};

export const serializeHighlightItems = (items: HighlightItemData[] = []): string =>
    JSON.stringify(
        items
            .map((item) => {
                if (item.type === 'text') {
                    const text = normalizeInlineRichText(item.text || '');
                    const plainText = extractPlainText(text);
                    return plainText ? { type: 'text', text } : null;
                }

                const title = item.title?.trim() || '';
                const values = (item.values || [])
                    .map((value) => normalizeInlineRichText(value || ''))
                    .filter((value) => extractPlainText(value).trim());

                return title || values.length ? { type: 'pair', title, values } : null;
            })
            .filter(Boolean)
    );

export const createHighlightItem = (type = 'pair') => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: '',
    values: [''],
    text: ''
});

export const normalizeHighlightText = (value = '') =>
    value
        .replace(/\u00a0/g, ' ')
        .trim();

export const escapeHtml = (value = '') =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

export const decodeHtmlEntities = (value = '') => {
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
    for (let i = 0; i < 3; i += 1) {
        const nextDecoded = decodeOnce(decoded);
        if (nextDecoded === decoded) break;
        decoded = nextDecoded;
    }

    return decoded.replace(/\u00a0/g, ' ');
};

export const extractPlainText = (value = '') => {
    if (!value) return '';
    if (!/<[a-z][\s\S]*>/i.test(value) || typeof window === 'undefined') {
        return normalizeHighlightText(decodeHtmlEntities(value));
    }

    return normalizeHighlightText(new DOMParser().parseFromString(value, 'text/html').body.textContent || '');
};

export const decodeHtmlPreview = (value = '') => {
    if (!value) return '';
    if (typeof window === 'undefined') {
        return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    }

    const doc = new DOMParser().parseFromString(value, 'text/html');
    return normalizeHighlightText(doc.body.textContent || '');
};

export const slugify = (value = '') => {
    const cleanValue = value.replace(/<[^>]*>/g, '');
    return cleanValue
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

export const normalizeInlineRichText = (html = '') => {
    if (!html || typeof window === 'undefined') return html;

    if (!/<[a-z][\s\S]*>/i.test(html)) {
        return escapeHtml(decodeHtmlEntities(html));
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const normalizeHref = (value = '') => {
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) return trimmed;
        if (trimmed.includes('@')) return `mailto:${trimmed}`;
        return `https://${trimmed.replace(/^\/+/, '')}`;
    };

    const serializeNode = (node: ChildNode): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeHtml(node.textContent || '');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const children = Array.from(node.childNodes).map(serializeNode).join('');
        const tag = node.tagName.toLowerCase();

        const style = node.getAttribute('style');
        const styleAttr = style ? ` style="${escapeHtml(style)}"` : '';

        if (tag === 'span') {
            if (style) {
                return `<span${styleAttr}>${children}</span>`;
            }
            return children;
        }
        if (tag === 'strong' || tag === 'b') return `<strong${styleAttr}>${children}</strong>`;
        if (tag === 'em' || tag === 'i') return `<em${styleAttr}>${children}</em>`;
        if (tag === 'br') return '<br>';
        if (tag === 'div' || tag === 'p' || tag === 'li') {
            return children ? `${children}<br>` : '<br>';
        }
        if (tag === 'a') {
            const href = normalizeHref(node.getAttribute('href') || node.textContent || '');
            return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${styleAttr}>${children || escapeHtml(node.textContent || href)}</a>` : children;
        }

        return children;
    };

    const normalized = Array.from(doc.body.childNodes)
        .map(serializeNode)
        .join('')
        .replace(/\u200B/g, '')
        .replace(/(?:<br>\s*){3,}/g, '<br><br>')
        .replace(/^(?:<br>\s*)+|(?:<br>\s*)+$/g, '');

    return normalized;
};

export const normalizeAboutRichText = (html = '') => {
    if (!html || typeof window === 'undefined') return html;

    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.body.querySelectorAll('*').forEach((element) => {
        element.style.removeProperty('font-size');
        element.style.removeProperty('line-height');
        element.style.removeProperty('font-family');

        ['ql-size-small', 'ql-size-large', 'ql-size-huge'].forEach((className) => {
            element.classList.remove(className);
        });

        if (!element.getAttribute('style')?.trim()) {
            element.removeAttribute('style');
        }
    });

    return doc.body.innerHTML
        .replace(/<p>\s*<\/p>\s*(<p>\s*<\/p>\s*){2,}/gi, '<p><br></p><p><br></p>');
};

const LazyTipTapEditor = lazy(async () => {
    const mod = await import('../../../components/TipTapEditor');
    return { default: mod.TipTapEditor };
});

const LazyTipTapMinimal = lazy(async () => {
    const mod = await import('../../../components/TipTapEditor');
    return { default: mod.TipTapMinimal };
});

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, required, children }) => (
    <div className="flex flex-col gap-1.5 mb-6 text-left">
        <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
            {label} {required && <span className="text-red-500 text-lg">*</span>}
        </label>
        {children}
    </div>
);

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  fallbackClassName?: string;
  [key: string]: unknown;
}

export const RichTextEditor = ({ value = '', onChange, placeholder, fallbackClassName = 'h-64', ...props }: RichTextEditorProps) => {
    return (
        <Suspense
            fallback={
                <div className={`rounded-xl border border-gray-200 bg-gray-50 ${fallbackClassName} flex items-center justify-center text-sm font-medium text-gray-500`}>
                    Loading editor...
                </div>
            }
        >
            <LazyTipTapEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                {...props}
            />
        </Suspense>
    );
};

interface InlineFormatEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  [key: string]: unknown;
}

export const InlineFormatEditor = ({ value, onChange, placeholder, ...props }: InlineFormatEditorProps) => {
    return (
        <Suspense
            fallback={
                <div className="rounded-xl border border-gray-200 bg-gray-50 h-16 flex items-center justify-center text-sm font-medium text-gray-500">
                    Loading editor...
                </div>
            }
        >
            <LazyTipTapMinimal
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                {...props}
            />
        </Suspense>
    );
};

interface HighlightItemData {
  id: string;
  type: string;
  title: string;
  values: string[];
  text: string;
}

interface HighlightItemsEditorProps {
  items?: HighlightItemData[];
  onChange: (items: HighlightItemData[]) => void;
}

export const HighlightItemsEditor = ({ items = [], onChange }: HighlightItemsEditorProps) => {
    const updateItem = (id, patch) => {
        onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    };

    const removeItem = (id) => {
        onChange(items.filter((item) => item.id !== id));
    };

    const addItem = (type) => {
        onChange([...items, createHighlightItem(type)]);
    };

    const moveItem = (fromIndex, direction) => {
        const toIndex = fromIndex + direction;
        if (toIndex < 0 || toIndex >= items.length) return;

        const nextItems = [...items];
        const [movedItem] = nextItems.splice(fromIndex, 1);
        nextItems.splice(toIndex, 0, movedItem);
        onChange(nextItems);
    };

    const updateValue = (itemId, valueIndex, nextValue) => {
        onChange(
            items.map((item) => {
                if (item.id !== itemId) return item;
                const nextValues = [...(item.values || [''])];
                nextValues[valueIndex] = nextValue;
                return { ...item, values: nextValues };
            })
        );
    };

    const addValue = (itemId) => {
        onChange(
            items.map((item) =>
                item.id === itemId
                    ? { ...item, values: [...(item.values || ['']), ''] }
                    : item
            )
        );
    };

    const removeValue = (itemId, valueIndex) => {
        onChange(
            items.map((item) => {
                if (item.id !== itemId) return item;
                const currentValues = item.values || [''];
                const nextValues = currentValues.filter((_, index) => index !== valueIndex);
                return { ...item, values: nextValues.length ? nextValues : [''] };
            })
        );
    };

    const moveValue = (itemId, valueIndex, direction) => {
        onChange(
            items.map((item) => {
                if (item.id !== itemId) return item;

                const currentValues = [...(item.values || [''])];
                const targetIndex = valueIndex + direction;

                if (targetIndex < 0 || targetIndex >= currentValues.length) {
                    return item;
                }

                const [movedValue] = currentValues.splice(valueIndex, 1);
                currentValues.splice(targetIndex, 0, movedValue);

                return { ...item, values: currentValues };
            })
        );
    };

    return (
        <div className="space-y-4">
            {items.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 md:p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                            Point {index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => moveItem(index, -1)}
                                disabled={index === 0}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white ${index === 0 ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                                aria-label="Move up"
                                title="Move up"
                            >
                                <ArrowUp size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => moveItem(index, 1)}
                                disabled={index === items.length - 1}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white ${index === items.length - 1 ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                                aria-label="Move down"
                                title="Move down"
                            >
                                <ArrowDown size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-red-500 hover:bg-red-50"
                            >
                                <Trash2 size={14} /> Remove
                            </button>
                        </div>
                    </div>

                    {item.type === 'pair' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 mb-2">
                                    Label
                                </label>
                                <InlineFormatEditor
                                    value={item.title}
                                    onChange={(nextValue) => updateItem(item.id, { title: nextValue })}
                                    placeholder="Example: Personal Email"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 mb-2">
                                    Values
                                </label>
                                <div className="space-y-3">
                                    {(item.values || ['']).map((value, valueIndex) => (
                                        <div key={`${item.id}-value-${valueIndex}`} className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <InlineFormatEditor
                                                    value={value}
                                                    onChange={(nextValue) => updateValue(item.id, valueIndex, nextValue)}
                                                    placeholder={valueIndex === 0 ? 'Example: azizul@ynu.ac.kr' : 'Add another value'}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2 mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => moveValue(item.id, valueIndex, -1)}
                                                    disabled={valueIndex === 0}
                                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white ${valueIndex === 0 ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                                                    aria-label="Move value up"
                                                    title="Move value up"
                                                >
                                                    <ArrowUp size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveValue(item.id, valueIndex, 1)}
                                                    disabled={valueIndex === (item.values || ['']).length - 1}
                                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white ${valueIndex === (item.values || ['']).length - 1 ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                                                    aria-label="Move value down"
                                                    title="Move value down"
                                                >
                                                    <ArrowDown size={15} />
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeValue(item.id, valueIndex)}
                                                className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50"
                                                aria-label="Remove value"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => addValue(item.id)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-700 hover:bg-gray-50"
                                    >
                                        <Plus size={14} /> Add Value
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 mb-2">
                                Text Only
                            </label>
                            <InlineFormatEditor
                                value={item.text}
                                onChange={(nextValue) => updateItem(item.id, { text: nextValue })}
                                placeholder="Example: Assistant Professor, Yeungnam University, Republic of Korea"
                            />
                        </div>
                    )}
                </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    type="button"
                    onClick={() => addItem('pair')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b3b75] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-black transition-colors"
                >
                    <Plus size={16} /> Add Label + Value
                </button>
                <button
                    type="button"
                    onClick={() => addItem('text')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <Plus size={16} /> Add Text Only
                </button>
            </div>

            <p className="text-xs text-gray-500 leading-6">
                Use one new line for each email or link inside the value box if you want to show more than one.
            </p>
        </div>
    );
};

interface StructuredItemsEditorProps {
  items?: import('../../../types').StructuredItem[];
  onChange: (items: import('../../../types').StructuredItem[]) => void;
  itemLabel?: string;
}

export const StructuredItemsEditor = ({ items = [], onChange, itemLabel = 'Entry' }: StructuredItemsEditorProps) => {
    const updateItem = (id, patch) => {
        onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    };

    const removeItem = (id) => {
        onChange(items.filter((item) => item.id !== id));
    };

    const addItem = (type) => {
        onChange([...items, createStructuredItem(type)]);
    };

    const moveItem = (fromIndex, direction) => {
        const toIndex = fromIndex + direction;
        if (toIndex < 0 || toIndex >= items.length) return;

        const nextItems = [...items];
        const [movedItem] = nextItems.splice(fromIndex, 1);
        nextItems.splice(toIndex, 0, movedItem);
        onChange(nextItems);
    };

    const updateValue = (itemId, valueIndex, nextValue) => {
        onChange(
            items.map((item) => {
                if (item.id !== itemId) return item;
                const nextValues = [...(item.values || [''])];
                nextValues[valueIndex] = nextValue;
                return { ...item, values: nextValues };
            })
        );
    };

    const addValue = (itemId) => {
        onChange(
            items.map((item) =>
                item.id === itemId
                    ? { ...item, values: [...(item.values || ['']), ''] }
                    : item
            )
        );
    };

    const removeValue = (itemId, valueIndex) => {
        onChange(
            items.map((item) => {
                if (item.id !== itemId) return item;
                const nextValues = (item.values || ['']).filter((_, index) => index !== valueIndex);
                return { ...item, values: nextValues.length ? nextValues : [''] };
            })
        );
    };

    const moveValue = (itemId, valueIndex, direction) => {
        onChange(
            items.map((item) => {
                if (item.id !== itemId) return item;

                const nextValues = [...(item.values || [''])];
                const targetIndex = valueIndex + direction;
                if (targetIndex < 0 || targetIndex >= nextValues.length) return item;

                const [movedValue] = nextValues.splice(valueIndex, 1);
                nextValues.splice(targetIndex, 0, movedValue);

                return { ...item, values: nextValues };
            })
        );
    };

    return (
        <div className="space-y-4">
            {items.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 md:p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                            {itemLabel} {index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => moveItem(index, -1)}
                                disabled={index === 0}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white ${index === 0 ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                                aria-label="Move up"
                                title="Move up"
                            >
                                <ArrowUp size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => moveItem(index, 1)}
                                disabled={index === items.length - 1}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white ${index === items.length - 1 ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                                aria-label="Move down"
                                title="Move down"
                            >
                                <ArrowDown size={15} />
                            </button>
                            <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-red-500 hover:bg-red-50"
                            >
                                <Trash2 size={14} /> Remove
                            </button>
                        </div>
                    </div>

                    {item.type === 'title' ? (
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 mb-2">
                                Title
                            </label>
                            <InlineFormatEditor
                                value={item.title}
                                onChange={(nextValue) => updateItem(item.id, { title: nextValue })}
                                placeholder="Example: Research Area"
                            />
                        </div>
                    ) : item.type === 'pair' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 mb-2">
                                    Label
                                </label>
                                <InlineFormatEditor
                                    value={item.title}
                                    onChange={(nextValue) => updateItem(item.id, { title: nextValue })}
                                    placeholder="Example: Passing Year"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 mb-2">
                                    Values
                                </label>
                                <div className="space-y-3">
                                    {(item.values || ['']).map((value, valueIndex) => (
                                        <div key={`${item.id}-value-${valueIndex}`} className="flex gap-2 items-start">
                                            <div className="flex-1">
                                                <InlineFormatEditor
                                                    value={value}
                                                    onChange={(nextValue) => updateValue(item.id, valueIndex, nextValue)}
                                                    placeholder={valueIndex === 0 ? 'Example: February 2023' : 'Add another value'}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2 mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => moveValue(item.id, valueIndex, -1)}
                                                    disabled={valueIndex === 0}
                                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white ${valueIndex === 0 ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                                                    aria-label="Move value up"
                                                    title="Move value up"
                                                >
                                                    <ArrowUp size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveValue(item.id, valueIndex, 1)}
                                                    disabled={valueIndex === (item.values || ['']).length - 1}
                                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-white ${valueIndex === (item.values || ['']).length - 1 ? 'cursor-not-allowed border-gray-200 text-gray-300' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                                                    aria-label="Move value down"
                                                    title="Move value down"
                                                >
                                                    <ArrowDown size={15} />
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeValue(item.id, valueIndex)}
                                                className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50"
                                                aria-label="Remove value"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => addValue(item.id)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-gray-700 hover:bg-gray-50"
                                    >
                                        <Plus size={14} /> Add Value
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 mb-2">
                                Text Only
                            </label>
                            <InlineFormatEditor
                                value={item.text}
                                onChange={(nextValue) => updateItem(item.id, { text: nextValue })}
                                placeholder="Example: Statistical and quantitative genetics"
                            />
                        </div>
                    )}
                </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    type="button"
                    onClick={() => addItem('title')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <Plus size={16} /> Add Title
                </button>
                <button
                    type="button"
                    onClick={() => addItem('pair')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b3b75] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-black transition-colors"
                >
                    <Plus size={16} /> Add Label + Value
                </button>
                <button
                    type="button"
                    onClick={() => addItem('text')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <Plus size={16} /> Add Text Only
                </button>
            </div>
        </div>
    );
};

interface FileUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  required?: boolean;
  accept?: string;
}

export const FileUploadField = ({ value, onChange, label, required, accept = "image/*" }: FileUploadFieldProps) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');
    const acceptedFileLabel = getAcceptedFileLabel(accept);

    const handleFileChange = async (e) => {
        const input = e.target;
        const file = input.files[0];
        if (!file) return;

        setUploadError('');
        setProgress(0);

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            setUploadError(`"${file.name}" is too large. Maximum upload size is ${MAX_UPLOAD_SIZE_MB} MB.`);
            input.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await api.post('/upload', formData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                }
            });
            setUploadError('');
            onChange(res.data.url);
        } catch (err) {
            setUploadError(formatUploadErrorMessage(err));
        } finally {
            setUploading(false);
            input.value = '';
        }
    };

    return (
        <Field label={label} required={required}>
            <div className="flex flex-col gap-3">
                {value && (
                    <div className="relative w-full max-w-xs rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-3">
                        {value.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img src={value} alt="Preview" className="w-full h-24 object-contain rounded" />
                        ) : (
                            <div className="flex items-center gap-3 text-blue-600 bg-blue-50 p-3 rounded">
                                <FileText size={20} />
                                <span className="text-xs font-bold truncate">{value.split('/').pop()}</span>
                            </div>
                        )}
                        <button 
                            type="button"
                            onClick={() => onChange('')}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <label className={`flex-1 flex items-center justify-center h-10 px-4 bg-gray-50 border border-gray-300 rounded cursor-pointer hover:border-blue-500 hover:bg-white transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2">
                            {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0b3b75] border-t-transparent" /> : <Plus size={16} className="text-[#0b3b75]" />}
                            <span className="text-xs font-bold text-gray-700">{uploading ? `Uploading...` : `Upload ${accept.includes('pdf') ? 'Document' : 'File'}`}</span>
                        </div>
                        <input type="file" className="hidden" accept={accept} onChange={handleFileChange} />
                    </label>
                    {value && <span className="text-[10px] text-brand-gold font-bold uppercase italic">File Active</span>}
                </div>
                {uploading && (
                    <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase">
                            <span>Uploading File</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-[#0b3b75] h-full rounded-full transition-all duration-300" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
                <p className="text-[11px] text-gray-500">
                    Allowed: {acceptedFileLabel}. Max {MAX_UPLOAD_SIZE_MB} MB.
                </p>
                {uploadError && (
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{uploadError}</span>
                    </div>
                )}
            </div>
        </Field>
    );
};

interface GalleryBulkUploadFieldProps {
  files?: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export const GalleryBulkUploadField = ({ files = [], onChange, disabled = false }: GalleryBulkUploadFieldProps) => {
    const [selectionError, setSelectionError] = useState('');

    const queuedFiles = useMemo(
        () => files.map((file, index) => ({
            id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
            file,
            previewUrl: URL.createObjectURL(file)
        })),
        [files]
    );

    useEffect(() => () => {
        queuedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    }, [queuedFiles]);

    const handleFileSelection = (event) => {
        const input = event.target;
        const selectedFiles = Array.from(input.files || []);
        if (!selectedFiles.length) return;

        const validFiles = [];
        const invalidFiles = [];

        selectedFiles.forEach((file) => {
            if (!file.type.startsWith('image/')) {
                invalidFiles.push(`${file.name} is not an image.`);
                return;
            }

            if (file.size > MAX_UPLOAD_SIZE_BYTES) {
                invalidFiles.push(`${file.name} exceeds the ${MAX_UPLOAD_SIZE_MB} MB limit.`);
                return;
            }

            validFiles.push(file);
        });

        if (validFiles.length) {
            const existingKeys = new Set(files.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
            const dedupedFiles = validFiles.filter((file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`));
            onChange([...files, ...dedupedFiles]);
        }

        setSelectionError(invalidFiles.join(' '));
        input.value = '';
    };

    const removeQueuedFile = (indexToRemove) => {
        onChange(files.filter((_, index) => index !== indexToRemove));
        setSelectionError('');
    };

    return (
        <Field label="Bulk Gallery Upload">
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
                <div className="flex items-center gap-3">
                    <label className={`flex-1 flex items-center justify-center h-11 px-4 bg-white border border-gray-300 rounded cursor-pointer hover:border-blue-500 hover:bg-white transition-all ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2">
                            <Plus size={16} className="text-blue-600" />
                            <span className="text-xs font-bold text-gray-700">Select Multiple Images</span>
                        </div>
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileSelection} />
                    </label>
                    {queuedFiles.length > 0 && (
                        <span className="text-[10px] text-brand-gold font-bold uppercase italic">
                            {queuedFiles.length} queued
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-gray-500">
                    Allowed: Images only. Max {MAX_UPLOAD_SIZE_MB} MB each. Files will upload one by one when you save.
                </p>
                {selectionError && (
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{selectionError}</span>
                    </div>
                )}
                {queuedFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {queuedFiles.map((item, index) => (
                            <div key={item.id} className="relative rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                                <img src={item.previewUrl} alt={item.file.name} className="h-24 w-full rounded object-cover" />
                                <div className="mt-2">
                                    <div className="truncate text-[11px] font-semibold text-gray-700">{item.file.name}</div>
                                    <div className="text-[10px] text-gray-500">{(item.file.size / (1024 * 1024)).toFixed(2)} MB</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeQueuedFile(index)}
                                    className="absolute right-2 top-2 rounded bg-red-500 p-1 text-white hover:bg-red-600"
                                    aria-label={`Remove ${item.file.name}`}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Field>
    );
};
