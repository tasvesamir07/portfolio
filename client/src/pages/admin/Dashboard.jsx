import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import 'react-quill-new/dist/quill.snow.css';
import { Plus, Trash2, Edit3, Save, ExternalLink, Image as ImageIcon, GraduationCap, Briefcase, FileText, User, Share2, Github, Linkedin, Twitter, Mail, Instagram, Globe, X, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import api, { clearResponseCache } from '../../api';
import { clearTranslationCache } from '../../i18n/translator';
import ConfirmModal from '../../components/ConfirmModal';
import { showSiteAlert } from '../../utils/siteAlerts';
import { expireSessionAndRedirect, getStoredToken, isTokenExpired, storeSessionToken } from '../../utils/authSession';
import {
    createStructuredItem,
    parseStructuredItems,
    serializeStructuredItems,
    buildStructuredPreview,
    buildStructuredFallbackText
} from '../../utils/structuredItems';
 
 const iconMap = {
     Github,
     Linkedin,
     Twitter,
     Instagram,
     Mail,
     Globe,
     FileText
 };

const Field = ({ label, required, children }) => (
    <div className="flex flex-col gap-1.5 mb-6 text-left">
        <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
            {label} {required && <span className="text-red-500 text-lg">*</span>}
        </label>
        {children}
    </div>
);

const MAX_UPLOAD_SIZE_MB = 4;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const PROFILE_OTP_REGEX = /^\d{0,6}$/;

const getAcceptedFileLabel = (accept = 'image/*') => {
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

const formatUploadErrorMessage = (error) => {
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

const uploadFileToMediaApi = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post('/upload', formData);
    return res.data.url;
};

const QUILL_SIZE_WHITELIST = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px'];
let quillRegistered = false;

const LazyReactQuill = React.lazy(async () => {
    const mod = await import('react-quill-new');
    const LoadedReactQuill = mod.default;

    if (!quillRegistered) {
        const Size = LoadedReactQuill.Quill.import('attributors/style/size');
        Size.whitelist = QUILL_SIZE_WHITELIST;
        LoadedReactQuill.Quill.register(Size, true);
        quillRegistered = true;
    }

    return { default: LoadedReactQuill };
});

const RichTextEditor = ({ value = '', onChange, fallbackClassName = 'h-64', commitDelay = 180, onBlur, ...props }) => {
    const [draftValue, setDraftValue] = useState(value || '');
    const latestDraftRef = React.useRef(value || '');
    const lastPropValueRef = React.useRef(value || '');
    const onChangeRef = React.useRef(onChange);
    const onBlurRef = React.useRef(onBlur);
    const timerRef = React.useRef(null);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onBlurRef.current = onBlur;
    }, [onBlur]);

    useEffect(() => {
        const normalizedValue = value || '';
        if (normalizedValue !== lastPropValueRef.current) {
            lastPropValueRef.current = normalizedValue;
            latestDraftRef.current = normalizedValue;
            setDraftValue(normalizedValue);
        }
    }, [value]);

    useEffect(() => () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }, []);

    const commitChange = (nextValue, immediate = false) => {
        latestDraftRef.current = nextValue;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const runCommit = () => {
            if (!onChangeRef.current) return;
            if (typeof React.startTransition === 'function') {
                React.startTransition(() => onChangeRef.current(nextValue));
                return;
            }
            onChangeRef.current(nextValue);
        };

        if (immediate) {
            runCommit();
            return;
        }

        timerRef.current = setTimeout(runCommit, commitDelay);
    };

    const handleEditorChange = (nextValue) => {
        lastPropValueRef.current = nextValue;
        setDraftValue(nextValue);
        commitChange(nextValue);
    };

    const handleEditorBlur = (...args) => {
        commitChange(latestDraftRef.current, true);
        onBlurRef.current?.(...args);
    };

    return (
        <React.Suspense
            fallback={
                <div className={`rounded-xl border border-gray-200 bg-gray-50 ${fallbackClassName} flex items-center justify-center text-sm font-medium text-gray-500`}>
                    Loading editor...
                </div>
            }
        >
            <LazyReactQuill
                {...props}
                value={draftValue}
                onChange={handleEditorChange}
                onBlur={handleEditorBlur}
            />
        </React.Suspense>
    );
};

const compactQuillModules = {
    toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'clean']
    ],
};

const compactQuillFormats = [
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link'
];

const aboutRichTextModules = {
    toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'clean']
    ],
};

const aboutRichTextFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link'
];

const normalizeAboutRichText = (html = '') => {
    if (!html || typeof window === 'undefined') return html;

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
        textNode.textContent = (textNode.textContent || '').replace(/\u00a0/g, ' ');
        textNode = walker.nextNode();
    }

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
        .replace(/&nbsp;/gi, ' ')
        .replace(/<p>\s*<\/p>\s*(<p>\s*<\/p>\s*){2,}/gi, '<p><br></p><p><br></p>');
};

const createHighlightItem = (type = 'pair') => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: '',
    values: [''],
    text: ''
});

const normalizeHighlightText = (value = '') =>
    value
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const escapeHtml = (value = '') =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const decodeHtmlEntities = (value = '') => {
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

const extractPlainText = (value = '') => {
    if (!value) return '';
    if (!/<[a-z][\s\S]*>/i.test(value) || typeof window === 'undefined') {
        return normalizeHighlightText(decodeHtmlEntities(value));
    }

    return normalizeHighlightText(new DOMParser().parseFromString(value, 'text/html').body.textContent || '');
};

const decodeHtmlPreview = (value = '') => {
    if (!value) return '';
    if (typeof window === 'undefined') {
        return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
    }

    const doc = new DOMParser().parseFromString(value, 'text/html');
    return normalizeHighlightText(doc.body.textContent || '');
};

const slugify = (value = '') =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const normalizeInlineRichText = (html = '') => {
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

    const serializeNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return escapeHtml(node.textContent || '');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return '';
        }

        const children = Array.from(node.childNodes).map(serializeNode).join('');
        const tag = node.tagName.toLowerCase();

        if (tag === 'strong' || tag === 'b') return `<strong>${children}</strong>`;
        if (tag === 'em' || tag === 'i') return `<em>${children}</em>`;
        if (tag === 'br') return '<br>';
        if (tag === 'div' || tag === 'p' || tag === 'li') {
            return children ? `${children}<br>` : '<br>';
        }
        if (tag === 'a') {
            const href = normalizeHref(node.getAttribute('href') || node.textContent || '');
            return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${children || escapeHtml(node.textContent || href)}</a>` : children;
        }

        return children;
    };

    const normalized = Array.from(doc.body.childNodes)
        .map(serializeNode)
        .join('')
        .replace(/\u200B/g, '')
        .replace(/(?:<br>\s*){3,}/g, '<br><br>')
        .replace(/^(?:<br>\s*)+|(?:<br>\s*)+$/g, '')
        .trim();

    return normalized;
};

const InlineFormatEditor = ({ value, onChange, placeholder }) => {
    const editorRef = React.useRef(null);
    const savedRangeRef = React.useRef(null);
    const latestValueRef = React.useRef(value || '');
    const lastCommittedValueRef = React.useRef(value || '');
    const onChangeRef = React.useRef(onChange);
    const timerRef = React.useRef(null);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('https://');

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!editorRef.current) return;
        const nextValue = value || '';
        latestValueRef.current = nextValue;
        lastCommittedValueRef.current = nextValue;

        // Never rewrite DOM while the editor is focused; it resets the caret.
        if (document.activeElement !== editorRef.current && editorRef.current.innerHTML !== nextValue) {
            editorRef.current.innerHTML = nextValue;
        }
    }, [value]);

    useEffect(() => () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }, []);

    const commitChange = (nextValue, immediate = false) => {
        latestValueRef.current = nextValue;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const runCommit = () => {
            if (nextValue === lastCommittedValueRef.current) return;
            lastCommittedValueRef.current = nextValue;
            onChangeRef.current?.(nextValue);
        };

        if (immediate) {
            runCommit();
            return;
        }

        timerRef.current = setTimeout(runCommit, 120);
    };

    const emitChange = (immediate = false) => {
        if (!editorRef.current) return;
        commitChange(normalizeInlineRichText(editorRef.current.innerHTML), immediate);
    };

    const insertLineBreak = () => {
        if (typeof document.execCommand === 'function') {
            const inserted = document.execCommand('insertLineBreak');
            if (inserted) return;
        }

        const selection = window.getSelection();
        if (!selection?.rangeCount) return;

        const range = selection.getRangeAt(0);
        range.deleteContents();

        const br = document.createElement('br');
        const spacer = document.createTextNode('\u200B');
        range.insertNode(spacer);
        range.insertNode(br);

        range.setStartAfter(spacer);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    };

    const handleKeyDown = (event) => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        insertLineBreak();
        emitChange();
    };

    const handleBlur = () => {
        emitChange(true);

        if (!editorRef.current) return;

        const normalizedValue = latestValueRef.current || '';
        if (editorRef.current.innerHTML !== normalizedValue) {
            editorRef.current.innerHTML = normalizedValue;
        }
    };

    const applyFormat = (command) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand(command, false);
        emitChange();
    };

    const restoreSavedSelection = () => {
        const selection = window.getSelection();
        if (!selection || !savedRangeRef.current) return false;
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
        return true;
    };

    const applyLink = () => {
        if (!editorRef.current) return;
        editorRef.current.focus();

        const selection = window.getSelection();
        const selectedText = selection?.toString().trim() || '';
        if (!selectedText) {
            showSiteAlert({ type: 'error', message: 'Select the text first, then add the link.' });
            return;
        }

        if (selection?.rangeCount) {
            savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        }

        setLinkUrl('https://');
        setIsLinkDialogOpen(true);
    };

    const handleLinkConfirm = () => {
        const trimmedUrl = linkUrl.trim();
        if (!trimmedUrl) {
            showSiteAlert({ type: 'error', message: 'Enter a valid link URL.' });
            return;
        }

        editorRef.current?.focus();
        restoreSavedSelection();
        document.execCommand('createLink', false, trimmedUrl);
        emitChange();
        savedRangeRef.current = null;
        setIsLinkDialogOpen(false);
    };

    return (
        <>
            <div className="rounded-xl border border-gray-300 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
                    <button
                        type="button"
                        onClick={() => applyFormat('bold')}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 hover:bg-gray-200"
                        aria-label="Bold"
                        title="Bold"
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        type="button"
                        onClick={() => applyFormat('italic')}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 hover:bg-gray-200 italic"
                        aria-label="Italic"
                        title="Italic"
                    >
                        I
                    </button>
                    <button
                        type="button"
                        onClick={applyLink}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 hover:bg-gray-200"
                        aria-label="Add link"
                        title="Add link"
                    >
                        <ExternalLink size={14} />
                    </button>
                </div>
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => emitChange()}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    data-placeholder={placeholder}
                    className="mini-inline-editor min-h-[52px] px-3 py-2.5 text-sm text-gray-900 outline-none"
                />
            </div>
            {isLinkDialogOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
                        <div className="mb-4 text-left">
                            <h3 className="text-lg font-bold text-gray-900">Add Link</h3>
                            <p className="mt-1 text-sm text-gray-500">Enter the full URL for the selected text.</p>
                        </div>
                        <input
                            autoFocus
                            className="input"
                            value={linkUrl}
                            onChange={(event) => setLinkUrl(event.target.value)}
                            placeholder="https://example.com"
                        />
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    savedRangeRef.current = null;
                                    setIsLinkDialogOpen(false);
                                }}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleLinkConfirm}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                            >
                                Insert Link
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const parseHighlightItems = (content = '') => {
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

const serializeHighlightItems = (items = []) =>
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

const HighlightItemsEditor = ({ items = [], onChange }) => {
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
                                <input
                                    className="input"
                                    value={item.title}
                                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
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

const StructuredItemsEditor = ({ items = [], onChange, itemLabel = 'Entry' }) => {
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
                            <input
                                className="input"
                                value={item.title}
                                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                                placeholder="Example: Research Area"
                            />
                        </div>
                    ) : item.type === 'pair' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500 mb-2">
                                    Label
                                </label>
                                <input
                                    className="input"
                                    value={item.title}
                                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
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

const FileUploadField = ({ value, onChange, label, required, accept = "image/*" }) => {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const acceptedFileLabel = getAcceptedFileLabel(accept);
    
    const handleFileChange = async (e) => {
        const input = e.target;
        const file = input.files[0];
        if (!file) return;

        setUploadError('');

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
            setUploadError(`"${file.name}" is too large. Maximum upload size is ${MAX_UPLOAD_SIZE_MB} MB.`);
            input.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await api.post('/upload', formData);
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
                            {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" /> : <Plus size={16} className="text-blue-600" />}
                            <span className="text-xs font-bold text-gray-700">{uploading ? 'Uploading...' : `Upload ${accept.includes('pdf') ? 'Document' : 'File'}`}</span>
                        </div>
                        <input type="file" className="hidden" accept={accept} onChange={handleFileChange} />
                    </label>
                    {value && <span className="text-[10px] text-brand-gold font-bold uppercase italic">File Active</span>}
                </div>
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

const GalleryBulkUploadField = ({ files = [], onChange, disabled = false }) => {
    const [selectionError, setSelectionError] = useState('');

    const queuedFiles = React.useMemo(
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

const Dashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const VALID_TABS = ['about', 'profile', 'academics', 'experiences', 'trainings', 'skills', 'research-interests', 'research', 'publications', 'blog', 'gallery', 'messages', 'social'];
    const STRUCTURED_TABS = ['academics', 'experiences', 'trainings', 'skills', 'research-interests', 'research', 'publications', 'blog'];
    const rawTab = searchParams.get('tab') || 'about';
    const activeTab = VALID_TABS.includes(rawTab) ? rawTab : 'about';

    useEffect(() => {
        const token = getStoredToken();
        if (!token || isTokenExpired(token)) {
            expireSessionAndRedirect({ showAlert: window.location.pathname !== '/admin' });
        }
    }, []);

    // Redirect unknown tabs (e.g. old ?tab=navigation) back to default
    useEffect(() => {
        if (rawTab && !VALID_TABS.includes(rawTab)) {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [rawTab]);

    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [categories, setCategories] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '', type: 'danger' });
    const [notice, setNotice] = useState(null);
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);

    const openConfirmModal = (title, message, onConfirm, type = 'danger') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(null), 2600);
        return () => clearTimeout(timer);
    }, [notice]);

    useEffect(() => {
        if (!saveError) return undefined;
        const timer = setTimeout(() => setSaveError(''), 5000);
        return () => clearTimeout(timer);
    }, [saveError]);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/gallery-categories');
            setCategories(res.data);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setContent([]); // Clear stale data immediately
        try {
            const endpoint = activeTab === 'social'
                ? '/social-links'
                : activeTab === 'profile'
                    ? '/profile'
                : activeTab === 'blog'
                    ? '/pages?includeContent=1'
                    : `/${activeTab}`;
            const res = await api.get(endpoint);
            setContent(Array.isArray(res.data) ? res.data : [res.data]);
            
            if (activeTab === 'gallery') {
                fetchCategories();
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setContent([]); // Ensure it's empty on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setIsEditing(false);
        setFormData({});
        setSaveError('');
    }, [activeTab]);

    const handleAddCategory = async (e) => {
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            const res = await api.post('/gallery-categories', { name: newCategoryName });
            setCategories([...categories, res.data]);
            setNewCategoryName('');
            clearTranslationCache();
            clearResponseCache();
            showSiteAlert({ type: 'success', message: 'Category added successfully.' });
            // Small delay to allow alert to be seen before refresh
            setTimeout(() => window.location.reload(), 800);
        } catch (err) {
            console.error('Error adding category:', err);
            showSiteAlert({ type: 'error', message: 'Failed to add category.' });
        }
    };

    const handleDeleteCategory = async (id) => {
        const category = categories.find(c => c.id === id);
        openConfirmModal(
            'Delete Category?',
            `Are you sure you want to delete "${category?.name}"? This will ALSO delete all images assigned to this category. This action cannot be undone.`,
            async () => {
                try {
                    await api.delete(`/gallery-categories/${id}`);
                    setCategories(categories.filter(c => c.id !== id));
                    clearTranslationCache();
                    clearResponseCache();
                    // If we are currently viewing gallery, refresh data to reflect deleted images
                    if (activeTab === 'gallery') {
                        fetchData();
                    }
                    setTimeout(() => window.location.reload(), 500);
                } catch (err) {
                    console.error('Error deleting category:', err);
                    showSiteAlert({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to delete category.' });
                }
            }
        );
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaveError('');
        setSaving(true);
        try {
            const endpoint = (activeTab === 'social' ? '/social-links' : activeTab === 'blog' ? '/pages' : `/${activeTab}`);
            const hasQueuedGalleryFiles = activeTab === 'gallery' && Array.isArray(formData.gallery_files) && formData.gallery_files.length > 0;

            if (activeTab === 'profile') {
                const username = (formData.username || '').trim();
                const email = (formData.email || '').trim().toLowerCase();
                const password = formData.password || '';
                const confirmPassword = formData.confirm_password || '';
                const otp = (formData.otp || '').trim();

                if (!username) {
                    throw new Error('Username is required.');
                }

                if (!email) {
                    throw new Error('Email is required for OTP verification.');
                }

                if (password && password.length < 6) {
                    throw new Error('Password must be at least 6 characters long.');
                }

                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match.');
                }

                if (!formData.otp_requested) {
                    const res = await api.post('/profile-otp', {
                        username,
                        email,
                        password
                    });

                    setFormData((prev) => ({
                        ...prev,
                        username,
                        email,
                        otp_requested: true,
                        otp: '',
                        otp_recipient: res.data?.recipientEmail || email
                    }));
                    setNotice({ type: 'success', message: res.data?.message || 'OTP sent successfully.' });
                    return;
                }

                if (!/^\d{6}$/.test(otp)) {
                    throw new Error('Enter the 6-digit OTP sent to your email.');
                }

                const res = await api.post('/profile-confirm', { otp });
                if (res.data?.token) {
                    storeSessionToken(res.data.token);
                }

                setIsEditing(false);
                setFormData({});
                setNotice({ type: 'success', message: res.data?.message || 'Profile updated successfully.' });
                clearTranslationCache();
                clearResponseCache();
                setTimeout(() => window.location.reload(), 1000);
                return;
            }

            if (activeTab === 'gallery' && !formData.id && !hasQueuedGalleryFiles && !formData.image_url) {
                throw new Error('Please upload at least one gallery image before saving.');
            }

            if (activeTab === 'about') {
                 const aboutPayload = {
                    ...formData,
                    sub_bio: serializeHighlightItems(formData.highlight_items || []),
                    bio_text: normalizeAboutRichText(formData.bio_text || ''),
                 };
                 delete aboutPayload.highlight_items;
                 await api.put('/about', aboutPayload);
            } else if (STRUCTURED_TABS.includes(activeTab)) {
                const structuredItems = formData.structured_items || [];
                const structuredPayload = {
                    ...formData,
                    details_json: serializeStructuredItems(structuredItems)
                };

                delete structuredPayload.structured_items;

                if (activeTab === 'academics') {
                    structuredPayload.institution = formData.institution || '';
                    structuredPayload.degree = formData.degree || '';
                    structuredPayload.start_year = formData.start_year || '';
                    structuredPayload.end_year = formData.end_year || '';
                }

                if (activeTab === 'experiences') {
                    structuredPayload.company = formData.company || '';
                    structuredPayload.position = formData.position || '';
                    structuredPayload.location = formData.location || '';
                    structuredPayload.start_date = formData.start_date || '';
                    structuredPayload.end_date = formData.end_date || '';
                    structuredPayload.description = normalizeAboutRichText(formData.description || '');
                }

                if (activeTab === 'trainings') {
                    structuredPayload.title = formData.title || '';
                    structuredPayload.topic = formData.topic || '';
                    structuredPayload.date_text = formData.date_text || '';
                    structuredPayload.instructor = formData.instructor || '';
                }

                if (activeTab === 'skills') {
                    structuredPayload.category = formData.category || '';
                    structuredPayload.items = buildStructuredFallbackText(structuredItems) || formData.items || '';
                }

                if (activeTab === 'research-interests') {
                    structuredPayload.interest = formData.interest || '';
                    structuredPayload.icon_name = formData.icon_name || '';
                    structuredPayload.details = formData.details || '';
                }

                if (activeTab === 'research') {
                    structuredPayload.title = formData.title || '';
                    structuredPayload.status = formData.status || '';
                    structuredPayload.date_text = formData.date_text || '';
                    structuredPayload.link = formData.link || '';
                    structuredPayload.image_url = formData.image_url || '';
                    structuredPayload.file_url = formData.file_url || '';
                    structuredPayload.description = formData.description || '';
                }

                if (activeTab === 'publications') {
                    structuredPayload.title = formData.title || '';
                    structuredPayload.thumbnail_url = formData.thumbnail_url || '';
                    structuredPayload.journal_name = formData.journal_name || '';
                    structuredPayload.pub_year = formData.pub_year || '';
                    structuredPayload.authors = formData.authors || '';
                    structuredPayload.link_url = formData.link_url || '';
                    structuredPayload.file_url = formData.file_url || '';
                    structuredPayload.introduction = formData.introduction || '';
                    structuredPayload.methods = formData.methods || '';
                }

                if (activeTab === 'blog') {
                    structuredPayload.title = formData.title || '';
                    structuredPayload.slug = slugify(formData.slug || formData.title || '');
                    structuredPayload.show_in_nav = Boolean(formData.show_in_nav);
                    structuredPayload.content = formData.content || '';
                }

                if (formData.id) {
                    await api.put(`${endpoint}/${formData.id}`, structuredPayload);
                } else {
                    await api.post(endpoint, structuredPayload);
                }
            } else if (activeTab === 'gallery' && !formData.id && hasQueuedGalleryFiles) {
                if (!formData.category) {
                    throw new Error('Please select a category before saving gallery images.');
                }

                const results = [];

                for (const file of formData.gallery_files) {
                    try {
                        const imageUrl = await uploadFileToMediaApi(file);
                        const payload = {
                            image_url: imageUrl,
                            caption: formData.caption || '',
                            category: formData.category || ''
                        };

                        await api.post('/gallery', payload);
                        results.push({ name: file.name, success: true });
                    } catch (fileError) {
                        results.push({
                            name: file.name,
                            success: false,
                            error: formatUploadErrorMessage(fileError)
                        });
                    }
                }

                const failedUploads = results.filter((item) => !item.success);
                const successfulCount = results.length - failedUploads.length;

                if (!successfulCount) {
                    throw new Error(failedUploads[0]?.error || 'No gallery images were uploaded.');
                }

                if (failedUploads.length) {
                    setNotice({
                        type: 'success',
                        message: `${successfulCount} image${successfulCount === 1 ? '' : 's'} saved. ${failedUploads.length} failed.`
                    });
                    setSaveError(failedUploads.map((item) => `${item.name}: ${item.error}`).join(' '));
                } else {
                    setNotice({
                        type: 'success',
                        message: `${successfulCount} gallery image${successfulCount === 1 ? '' : 's'} saved successfully.`
                    });
                }
            } else if (formData.id) {
                await api.put(`${endpoint}/${formData.id}`, formData);
            } else {
                await api.post(endpoint, formData);
            }
            setIsEditing(false);
            setFormData({});
            if (!(activeTab === 'gallery' && !formData.id && hasQueuedGalleryFiles)) {
                setNotice({ type: 'success', message: 'Saved successfully.' });
            }
            clearTranslationCache();
            clearResponseCache();
            if (activeTab === 'profile') {
                fetchData();
            } else {
                setTimeout(() => window.location.reload(), 800);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
            setSaveError(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        openConfirmModal(
            'Confirm Deletion',
            'Are you sure you want to delete this record? This action cannot be undone.',
            async () => {
                try {
                    const endpoint = (activeTab === 'social' ? '/social-links' : activeTab === 'blog' ? '/pages' : `/${activeTab}`);
                    await api.delete(`${endpoint}/${id}`);
                    clearTranslationCache();
                    clearResponseCache();
                    setTimeout(() => window.location.reload(), 500);
                } catch {
                    showSiteAlert({ type: 'error', message: 'Error deleting item.' });
                }
            }
        );
    };

    const handleMove = async (index, direction) => {
        const newContent = [...content];
        const targetIndex = index + direction;
        
        if (targetIndex < 0 || targetIndex >= newContent.length) return;
        
        const temp = newContent[index];
        newContent[index] = newContent[targetIndex];
        newContent[targetIndex] = temp;
        
        setContent(newContent);
        
        const orders = newContent.map((item, idx) => ({
            id: item.id,
            sort_order: idx
        }));
        
        let table;
        if (activeTab === 'research-interests') {
            table = 'research_interests';
        } else if (activeTab === 'social') {
            table = 'social_links';
        } else if (activeTab === 'gallery') {
            table = 'gallery';
        } else if (activeTab === 'blog' || activeTab === 'messages') {
            return;
        } else {
            table = activeTab;
        }

        try {
            await api.put(`/reorder/${table}`, { orders });
        } catch (err) {
            console.error('Error reordering:', err);
            fetchData(); // Revert to original order or refetch data on error
        } finally {
            clearTranslationCache();
            clearResponseCache();
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    const prepareAboutFormData = (about = {}) => ({
        ...about,
        name: about.name || '',
        site_name: about.site_name || '',
        title: about.title || '',
        location: about.location || '',
        bio_text: about.bio_text || '',
        highlight_items: parseHighlightItems(about.sub_bio || '')
    });

    const prepareProfileFormData = (profile = {}) => ({
        ...profile,
        username: profile.username || '',
        email: profile.email || '',
        password: '',
        confirm_password: '',
        otp: '',
        otp_requested: false,
        otp_recipient: ''
    });

    const updateProfileDraft = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
            otp_requested: false,
            otp: '',
            otp_recipient: ''
        }));
    };

    const buildLegacyStructuredItems = (tab, record = {}) => {
        if (tab === 'academics') {
            const items = [];
            const timeline = [record.start_year, record.end_year].filter(Boolean).join(' - ');

            if (record.degree) {
                items.push({
                    id: `${Date.now()}-degree`,
                    type: 'title',
                    title: record.degree,
                    values: [''],
                    text: ''
                });
            }

            if (timeline) {
                items.push({
                    id: `${Date.now()}-timeline`,
                    type: 'pair',
                    title: 'Timeline',
                    values: [timeline],
                    text: ''
                });
            }

            if (record.institution) {
                items.push({
                    id: `${Date.now()}-institution`,
                    type: 'text',
                    title: '',
                    values: [''],
                    text: record.institution
                });
            }

            return items;
        }

        if (tab === 'experiences') {
            if (record.description) {
                return parseStructuredItems(record.description);
            }

            const items = [];
            const timeline = [record.start_date, record.end_date].filter(Boolean).join(' - ');

            if (record.position) {
                items.push({
                    id: `${Date.now()}-position`,
                    type: 'title',
                    title: record.position,
                    values: [''],
                    text: ''
                });
            }

            if (timeline) {
                items.push({
                    id: `${Date.now()}-exp-timeline`,
                    type: 'pair',
                    title: 'Timeline',
                    values: [timeline],
                    text: ''
                });
            }

            if (record.location) {
                items.push({
                    id: `${Date.now()}-exp-location`,
                    type: 'pair',
                    title: 'Location',
                    values: [record.location],
                    text: ''
                });
            }

            return items;
        }

        if (tab === 'trainings') {
            const items = [];

            if (record.title) {
                items.push({
                    id: `${Date.now()}-training-title`,
                    type: 'title',
                    title: record.title,
                    values: [''],
                    text: ''
                });
            }

            if (record.topic) {
                items.push({
                    id: `${Date.now()}-training-topic`,
                    type: 'text',
                    title: '',
                    values: [''],
                    text: record.topic
                });
            }

            if (record.date_text) {
                items.push({
                    id: `${Date.now()}-training-date`,
                    type: 'pair',
                    title: 'Duration / Time',
                    values: [record.date_text],
                    text: ''
                });
            }

            if (record.instructor) {
                items.push({
                    id: `${Date.now()}-training-instructor`,
                    type: 'pair',
                    title: 'Instructor / Organization',
                    values: [record.instructor],
                    text: ''
                });
            }

            return items;
        }

        if (tab === 'skills' && record.items) {
            return record.items
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
                .map((value, index) => ({
                    id: `${Date.now()}-skill-${index}`,
                    type: 'text',
                    title: '',
                    values: [''],
                    text: value
                }));
        }

        if (tab === 'research-interests' && record.details) {
            return parseStructuredItems(record.details);
        }

        if (tab === 'research' && record.description) {
            return parseStructuredItems(record.description);
        }

        if (tab === 'publications') {
            const items = [];

            if (record.introduction) {
                items.push({
                    id: `${Date.now()}-publication-introduction-title`,
                    type: 'title',
                    title: 'Introduction',
                    values: [''],
                    text: ''
                });

                parseStructuredItems(record.introduction).forEach((item, index) => {
                    items.push({
                        ...item,
                        id: `${Date.now()}-publication-introduction-${index}`
                    });
                });
            }

            if (record.methods) {
                items.push({
                    id: `${Date.now()}-publication-methods-title`,
                    type: 'title',
                    title: 'Materials and Methods',
                    values: [''],
                    text: ''
                });

                parseStructuredItems(record.methods).forEach((item, index) => {
                    items.push({
                        ...item,
                        id: `${Date.now()}-publication-methods-${index}`
                    });
                });
            }

            return items;
        }

        if (tab === 'blog' && record.content) {
            return parseStructuredItems(record.content);
        }

        return [];
    };

    const prepareStructuredFormData = (record = {}) => {
        const hasSavedStructuredJson =
            typeof record.details_json === 'string' && record.details_json.trim().startsWith('[');

        let structuredItems = parseStructuredItems(record.details_json || '');
        if (!structuredItems.length && !hasSavedStructuredJson) {
            structuredItems = buildLegacyStructuredItems(activeTab, record);
        }

        return {
            ...(activeTab === 'blog' ? { show_in_nav: true } : {}),
            ...record,
            structured_items: structuredItems
        };
    };

    const openEditor = (nextFormData = {}) => {
        const normalizedFormData = activeTab === 'about'
                ? prepareAboutFormData(nextFormData)
                : activeTab === 'profile'
                    ? prepareProfileFormData(nextFormData)
                : STRUCTURED_TABS.includes(activeTab)
                    ? prepareStructuredFormData(nextFormData)
                    : nextFormData;

        const applyState = () => {
            setSaveError('');
            setFormData(normalizedFormData);
            setIsEditing(true);
        };

        if (typeof React.startTransition === 'function') {
            React.startTransition(applyState);
            return;
        }

        applyState();
    };

    const addButtonLabel =
        activeTab === 'blog'
            ? 'Blog Page'
            : activeTab === 'gallery'
                ? 'Add to Gallery'
                : activeTab === 'profile'
                    ? 'Profile'
                : activeTab.slice(0, -1);

    const getAdminDetailsPreview = (item = {}) => {
        if (activeTab === 'gallery') return item.category || 'Uncategorized';
        if (activeTab === 'messages') return item.message || 'No message';
        if (activeTab === 'profile') return item.email || 'No email configured';

        if (STRUCTURED_TABS.includes(activeTab)) {
            const structuredPreview = buildStructuredPreview(item.details_json || '');
            if (structuredPreview) return structuredPreview;

            switch (activeTab) {
                case 'skills':
                    return item.items || item.category || 'No details';
                case 'research-interests':
                    return item.details || item.interest || 'No details';
                case 'research':
                    return item.description || item.status || item.title || 'No details';
                case 'publications':
                    return item.introduction || item.methods || item.journal_name || 'No details';
                case 'blog':
                    return item.content || item.slug || 'No details';
                default:
                    return item.details || item.position || item.description || item.degree || 'No details';
            }
        }

        return item.details || item.position || item.description || item.bio_text || item.journal_name || item.url || item.degree || 'No details';
    };

    const renderForm = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                            Save once to send a 6-digit OTP. Save again with that OTP to confirm the update. Requesting a new OTP immediately invalidates the previous one.
                        </div>
                        <Field label="Username" required>
                            <input
                                className="input"
                                value={formData.username || ''}
                                onChange={(e) => updateProfileDraft('username', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label="Email" required>
                            <input
                                type="email"
                                className="input"
                                value={formData.email || ''}
                                onChange={(e) => updateProfileDraft('email', e.target.value)}
                                required
                            />
                        </Field>
                        <Field label="New Password">
                            <input
                                type="password"
                                className="input"
                                value={formData.password || ''}
                                onChange={(e) => updateProfileDraft('password', e.target.value)}
                                placeholder="Leave empty to keep the current password"
                            />
                        </Field>
                        <Field label="Confirm New Password">
                            <input
                                type="password"
                                className="input"
                                value={formData.confirm_password || ''}
                                onChange={(e) => updateProfileDraft('confirm_password', e.target.value)}
                                placeholder="Repeat the new password"
                            />
                        </Field>
                        {formData.otp_requested && (
                            <>
                                <div className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                    OTP sent to {formData.otp_recipient || formData.email}. It stays valid for 5 minutes unless you request a new code.
                                </div>
                                <Field label="6-Digit OTP" required>
                                    <input
                                        className="input tracking-[0.4em] text-center text-lg font-bold"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={formData.otp || ''}
                                        onChange={(e) => {
                                            const nextValue = e.target.value.replace(/\D/g, '');
                                            if (!PROFILE_OTP_REGEX.test(nextValue)) return;
                                            setFormData((prev) => ({ ...prev, otp: nextValue }));
                                        }}
                                        placeholder="000000"
                                        required
                                    />
                                </Field>
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, otp_requested: false, otp: '', otp_recipient: '' }))}
                                        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
                                    >
                                        Request New OTP
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                );
            case 'academics':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Institution Name">
                            <input className="input" value={formData.institution || ''} onChange={e => setFormData({...formData, institution: e.target.value})} />
                        </Field>
                        <Field label="Degree / Certificate">
                            <input className="input" value={formData.degree || ''} onChange={e => setFormData({...formData, degree: e.target.value})} />
                        </Field>
                        <Field label="Start Year">
                            <input className="input" value={formData.start_year || ''} onChange={e => setFormData({...formData, start_year: e.target.value})} />
                        </Field>
                        <Field label="End Year (or 'Present')">
                            <input className="input" value={formData.end_year || ''} onChange={e => setFormData({...formData, end_year: e.target.value})} />
                        </Field>
                        <div className="md:col-span-2">
                            <FileUploadField 
                                label="Institution Logo" 
                                value={formData.logo_url} 
                                onChange={url => setFormData({...formData, logo_url: url})} 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Field label="Academic Details">
                                <StructuredItemsEditor
                                    items={formData.structured_items || []}
                                    onChange={(items) => setFormData({ ...formData, structured_items: items })}
                                    itemLabel="Detail"
                                />
                            </Field>
                        </div>
                    </div>
                );
            case 'experiences':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Company / Organization">
                            <input className="input" value={formData.company || ''} onChange={e => setFormData({...formData, company: e.target.value})} />
                        </Field>
                        <Field label="Position Title">
                            <input className="input" value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} />
                        </Field>
                        <Field label="Location">
                            <input className="input" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} />
                        </Field>
                        <Field label="Start Date (e.g. Jan 2023)">
                            <input className="input" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                        </Field>
                        <Field label="End Date (or 'Present')">
                            <input className="input" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                        </Field>
                        <div className="md:col-span-2 border-t pt-4 mt-2">
                             <FileUploadField 
                                label="Company Logo" 
                                value={formData.logo_url} 
                                onChange={url => setFormData({...formData, logo_url: url})} 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Field label="Experience Details">
                                <StructuredItemsEditor
                                    items={formData.structured_items || []}
                                    onChange={(items) => setFormData({ ...formData, structured_items: items })}
                                    itemLabel="Detail"
                                />
                            </Field>
                        </div>
                        <div className="md:col-span-2">
                            <Field label="Legacy Description (Optional)">
                                <RichTextEditor
                                    theme="snow"
                                    value={formData.description || ''}
                                    onChange={val => setFormData(prev => ({...prev, description: val}))}
                                    modules={compactQuillModules}
                                    formats={compactQuillFormats}
                                />
                            </Field>
                        </div>
                    </div>
                );
            case 'trainings':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Training / Workshop Title">
                            <input className="input" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                        </Field>
                        <Field label="Topic / Content">
                            <input className="input" value={formData.topic || ''} onChange={e => setFormData({...formData, topic: e.target.value})} />
                        </Field>
                        <Field label="Duration / Time">
                            <input className="input" value={formData.date_text || ''} onChange={e => setFormData({...formData, date_text: e.target.value})} />
                        </Field>
                        <Field label="Instructor / Organization">
                            <input className="input" value={formData.instructor || ''} onChange={e => setFormData({...formData, instructor: e.target.value})} />
                        </Field>
                        <div className="md:col-span-2">
                            <Field label="Training Details">
                                <StructuredItemsEditor
                                    items={formData.structured_items || []}
                                    onChange={(items) => setFormData({ ...formData, structured_items: items })}
                                    itemLabel="Detail"
                                />
                            </Field>
                        </div>
                    </div>
                );
            case 'skills':
                return (
                    <div className="grid grid-cols-1 gap-4">
                        <Field label="Skill Category (e.g. Programming Languages)">
                            <input className="input" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
                        </Field>
                        <Field label="Skill Details">
                            <StructuredItemsEditor
                                items={formData.structured_items || []}
                                onChange={(items) => setFormData({ ...formData, structured_items: items })}
                                itemLabel="Detail"
                            />
                        </Field>
                    </div>
                );
            case 'research-interests':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Interest Area Title">
                            <input className="input" value={formData.interest || ''} onChange={e => setFormData({...formData, interest: e.target.value})} />
                        </Field>
                        <Field label="Icon Selection">
                            <div className="flex flex-wrap gap-2 mt-1">
                                {[
                                    { name: 'Work', id: 'Briefcase', icon: Briefcase },
                                    { name: 'Academic', id: 'GraduationCap', icon: GraduationCap },
                                    { name: 'Research', id: 'FileText', icon: FileText },
                                    { name: 'Global', id: 'Globe', icon: Globe }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setFormData({...formData, icon_name: item.id})}
                                        className={`flex-1 flex flex-col items-center justify-center p-3 rounded border transition-all gap-1 min-w-[80px] ${formData.icon_name === item.id ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'}`}
                                    >
                                        <item.icon size={20} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{item.name}</span>
                                    </button>
                                ))}
                            </div>
                        </Field>
                        <div className="md:col-span-2">
                            <Field label="Interest Details">
                                <StructuredItemsEditor
                                    items={formData.structured_items || []}
                                    onChange={(items) => setFormData({ ...formData, structured_items: items })}
                                    itemLabel="Detail"
                                />
                            </Field>
                        </div>
                    </div>
                );
            case 'research':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Research Project Title">
                            <input className="input" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                        </Field>
                        <Field label="Status / Phase (e.g. Ongoing, Completed)">
                            <input className="input" value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value})} placeholder="Ongoing / Published / Case Study" />
                        </Field>
                        <Field label="Research Timeline / Date">
                            <input className="input" value={formData.date_text || ''} onChange={e => setFormData({...formData, date_text: e.target.value})} placeholder="Jan 2023 - Present" />
                        </Field>
                        <Field label="Project Link (Optional)">
                            <input className="input" value={formData.link || ''} onChange={e => setFormData({...formData, link: e.target.value})} />
                        </Field>
                        <div className="md:col-span-1">
                             <FileUploadField 
                                label="Project Image / Cover" 
                                value={formData.image_url} 
                                onChange={url => setFormData({...formData, image_url: url})} 
                            />
                        </div>
                        <div className="md:col-span-1">
                             <FileUploadField 
                                label="Full Paper (PDF)" 
                                value={formData.file_url} 
                                onChange={url => setFormData({...formData, file_url: url})} 
                                accept=".pdf"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Field label="Research Details">
                                <StructuredItemsEditor
                                    items={formData.structured_items || []}
                                    onChange={(items) => setFormData({ ...formData, structured_items: items })}
                                    itemLabel="Detail"
                                />
                            </Field>
                        </div>
                    </div>
                );
            case 'publications':
                return (
                    <div className="grid grid-cols-1 gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Publication Title">
                                <input className="input" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </Field>
                            <Field label="Journal / Conference Name">
                                <input className="input" value={formData.journal_name || ''} onChange={e => setFormData({...formData, journal_name: e.target.value})} />
                            </Field>
                            <Field label="Publication Year">
                                <input className="input" value={formData.pub_year || ''} onChange={e => setFormData({...formData, pub_year: e.target.value})} />
                            </Field>
                            <Field label="Authors (Separate with commas)">
                                <input className="input" value={formData.authors || ''} onChange={e => setFormData({...formData, authors: e.target.value})} />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FileUploadField 
                                label="Thumbnail / Cover Image" 
                                value={formData.thumbnail_url} 
                                onChange={url => setFormData({...formData, thumbnail_url: url})} 
                            />
                        </div>

                        <Field label="External Link (Optional)">
                            <input className="input" value={formData.link_url || ''} onChange={e => setFormData({...formData, link_url: e.target.value})} />
                        </Field>

                        <Field label="Publication Details">
                            <StructuredItemsEditor
                                items={formData.structured_items || []}
                                onChange={(items) => setFormData({ ...formData, structured_items: items })}
                                itemLabel="Detail"
                            />
                        </Field>
                    </div>
                );
            case 'blog':
                return (
                    <div className="grid grid-cols-1 gap-4">
                        <Field label="Page Title">
                            <input
                                className="input"
                                value={formData.title || ''}
                                onChange={(e) => {
                                    const nextTitle = e.target.value;
                                    setFormData((prev) => ({
                                        ...prev,
                                        title: nextTitle,
                                        slug: !prev.id && (!prev.slug || prev.slug === slugify(prev.title || ''))
                                            ? slugify(nextTitle)
                                            : prev.slug
                                    }));
                                }}
                                placeholder="Example: Study"
                            />
                        </Field>
                        <Field label="Page Slug">
                            <input
                                className="input"
                                value={formData.slug || ''}
                                onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                                placeholder="study"
                            />
                            <p className="text-xs text-gray-500 mt-2">This page will open at `/blog/{formData.slug || 'your-slug'}`.</p>
                        </Field>
                        <Field label="Show In Blog Menu">
                            <label className="inline-flex items-center gap-3 text-sm font-semibold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={Boolean(formData.show_in_nav)}
                                    onChange={(e) => setFormData({ ...formData, show_in_nav: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-[#0b3b75] focus:ring-[#0b3b75]"
                                />
                                Show this page inside the navbar Blog dropdown
                            </label>
                        </Field>
                        <Field label="Page Content">
                            <StructuredItemsEditor
                                items={formData.structured_items || []}
                                onChange={(items) => setFormData({ ...formData, structured_items: items })}
                                itemLabel="Section"
                            />
                        </Field>
                    </div>
                );
            case 'about':
                 return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                             <Field label="Full Name" required>
                                <input className="input" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
                            </Field>
                        </div>
                        <div className="md:col-span-2">
                             <Field label="Portfolio Site Name">
                                <input className="input" value={formData.site_name || ''} onChange={e => setFormData({...formData, site_name: e.target.value})} placeholder="Samir's Portfolio" />
                            </Field>
                        </div>
                        <div className="md:col-span-2">
                            <FileUploadField 
                                label="Website Logo (PNG/SVG)" 
                                value={formData.logo_url || ''} 
                                onChange={val => setFormData({...formData, logo_url: val})} 
                                accept="image/*"
                            />
                        </div>
                        <Field label="Professional Title" required>
                            <input className="input" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
                        </Field>
                        <Field label="Location" required>
                            <input className="input" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} required />
                        </Field>
                        <div className="md:col-span-2">
                            <FileUploadField 
                                label="Upload Your CV (PDF/DOCX)" 
                                value={formData.resume_url || ''} 
                                onChange={val => setFormData({...formData, resume_url: val})} 
                                accept=".pdf,.doc,.docx"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <FileUploadField 
                                label="Hero Image" 
                                value={formData.hero_image_url || ''} 
                                onChange={val => setFormData({...formData, hero_image_url: val})} 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Field label="Short Hero Bio" required>
                                <HighlightItemsEditor
                                    items={formData.highlight_items || []}
                                    onChange={(items) => setFormData({ ...formData, highlight_items: items })}
                                 Serr />
                            </Field>
                        </div>
                        <div className="md:col-span-2">
                            <Field label="Detailed Biography" required>
                                <RichTextEditor 
                                    theme="snow"
                                    value={formData.bio_text || ''} 
                                    onChange={val => setFormData(prev => ({...prev, bio_text: val}))} 
                                    modules={aboutRichTextModules}
                                    formats={aboutRichTextFormats}
                                    className="bg-white h-64 mb-12"
                                />
                            </Field>
                        </div>
                    </div>
                );
            case 'gallery':
                return (
                    <div className="grid grid-cols-1 gap-4">
                        {!formData.id && (
                            <GalleryBulkUploadField
                                files={formData.gallery_files || []}
                                onChange={(files) => setFormData({ ...formData, gallery_files: files })}
                                disabled={saving}
                            />
                        )}
                        <FileUploadField 
                            label={formData.id ? "Gallery Image" : "Single Gallery Image (Optional)"} required={Boolean(formData.id)}
                            value={formData.image_url || ''} 
                            onChange={val => setFormData({...formData, image_url: val})} 
                        />
                        <Field label="Short Caption">
                            <input className="input" value={formData.caption || ''} onChange={e => setFormData({...formData, caption: e.target.value})} />
                        </Field>
                        <Field label="Category" required>
                            <select 
                                className="input" 
                                value={formData.category || ''} 
                                onChange={e => setFormData({...formData, category: e.target.value})}
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </Field>
                    </div>
                );
            case 'messages':
                return (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                        Messages are read-only. Open a message from the list below to review what visitors sent, or delete it when you no longer need it.
                    </div>
                );
            case 'social':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Platform Name" required>
                            <input className="input" value={formData.platform || ''} onChange={e => setFormData({...formData, platform: e.target.value})} placeholder="e.g. GitHub" required />
                        </Field>
                        <Field label="Icon Selection" required>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1">
                                {Object.entries(iconMap).map(([name, Icon]) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, icon_name: name, platform: name })}
                                        className={`p-3 rounded border transition-all flex flex-col items-center gap-1 ${formData.icon_name === name ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}
                                    >
                                        <Icon size={18} />
                                        <span className="text-[9px] font-bold uppercase truncate w-full">{name}</span>
                                    </button>
                                ))}
                            </div>
                        </Field>
                        <div className="md:col-span-2">
                            <Field label="Full profile URL" required>
                                <input className="input" value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." required />
                            </Field>
                        </div>
                        <Field label="Color Theme">
                            <select 
                                className="input" 
                                value={formData.color_class || ''} 
                                onChange={e => setFormData({...formData, color_class: e.target.value})}
                            >
                                <option value="hover:text-gray-900">Default (Dark Gray)</option>
                                <option value="hover:text-blue-600">Blue (LinkedIn Style)</option>
                                <option value="hover:text-sky-500">Sky Blue (Twitter Style)</option>
                                <option value="hover:text-pink-600">Pink (Instagram Style)</option>
                                <option value="hover:text-brand-blue">Orange (Mail Style)</option>
                                <option value="hover:text-emerald-600">Emerald (Creative Style)</option>
                            </select>
                        </Field>
                    </div>
                );
            default:
                return <p className="text-gray-500 py-10">This section is currently under development.</p>;
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 text-gray-900 min-h-screen bg-gray-50/20">
            {notice && (
                <div className="fixed right-5 top-5 z-[80] rounded-xl border border-brand-gold/20 bg-brand-gold/[0.03] px-4 py-3 text-sm font-semibold text-brand-gold shadow-lg">
                    {notice.message}
                </div>
            )}
            <style>{`
                .input {
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #1f2937;
                    background-color: #fff;
                    background-clip: padding-box;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    transition: border-color .15s ease-in-out,box-shadow .15s ease-in-out;
                    outline: none;
                }
                .input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .ql-editor { min-height: 200px; font-size: 14px; background: white; }
                .ql-toolbar { border-radius: 4px 4px 0 0 !important; background: #f9fafb; border: 1px solid #d1d5db !important; border-bottom: none !important; }
                .ql-container { border-radius: 0 0 4px 4px !important; border: 1px solid #d1d5db !important; background: white; }
                .mini-inline-editor:empty::before {
                    content: attr(data-placeholder);
                    color: #9ca3af;
                }
                
                /* Show Pixel Sizes in Dropdown */
                .ql-snow .ql-picker.ql-size .ql-picker-label::before,
                .ql-snow .ql-picker.ql-size .ql-picker-item::before {
                  content: attr(data-value) !important;
                }
                .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="16px"]::before,
                .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="16px"]::before {
                  content: "16px (Normal)" !important;
                }
            `}</style>
            
            <header className="flex flex-wrap justify-between items-center mb-10 gap-4 border-b pb-6">
                <div className="text-left">
                    <h1 className="text-3xl font-black uppercase text-gray-800 tracking-tight">{activeTab}</h1>
                    <p className="text-gray-500 text-sm font-medium">Content Management System / {activeTab}</p>
                </div>
            </header>

            <div className="bg-white rounded-lg p-6 md:p-10 border border-gray-200 shadow-sm">
                {!isEditing ? (
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                            <div className="text-left">
                                <h2 className="text-xl font-bold text-gray-800">Available Entries</h2>
                                <p className="text-sm text-gray-500 font-medium">Currently managing {content.length} records.</p>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                {activeTab !== 'about' && activeTab !== 'messages' && activeTab !== 'profile' && (
                                    <button onClick={() => openEditor({})} className="bg-gray-800 hover:bg-black text-white px-6 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 flex-1 md:flex-none">
                                        <Plus size={18} /> {activeTab === 'gallery' ? addButtonLabel : `Add New ${addButtonLabel}`}
                                    </button>
                                )}
                                {(activeTab === 'about' || activeTab === 'profile') && (
                                    <button onClick={() => openEditor(activeTab === 'profile' ? prepareProfileFormData(content[0] || {}) : prepareAboutFormData(content[0] || {}))} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 flex-1 md:flex-none">
                                        <Edit3 size={18} /> {activeTab === 'profile' ? 'Edit Profile' : 'Edit Biography'}
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                            <table className="w-full text-left border-collapse bg-white">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Record Info</th>
                                        <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Details</th>
                                        <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500 text-right min-w-[180px]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {content.map((item, idx) => (
                                        <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-base leading-tight">
                                                            {activeTab === 'messages'
                                                                ? (item.name || item.email || 'Message')
                                                                : activeTab === 'profile'
                                                                    ? (item.username || 'Admin User')
                                                                : (item.interest || item.company || item.platform || item.title || item.category || item.institution || item.caption || (item.image_url ? 'Gallery Image' : '') || (activeTab === 'about' ? 'Biography' : 'Nameless Item'))}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase">
                                                            {activeTab === 'messages'
                                                                ? (item.email || 'No email')
                                                                : activeTab === 'profile'
                                                                    ? (item.email || 'No email configured')
                                                                    : `ID: #${item.id || 'N/A'}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-gray-600 font-medium max-w-md">
                                                <div className="truncate text-xs">
                                                    {decodeHtmlPreview(getAdminDetailsPreview(item))}
                                                </div>
                                            </td>
                                            <td className="py-4 pl-6 pr-8 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {activeTab !== 'about' && activeTab !== 'blog' && activeTab !== 'messages' && activeTab !== 'profile' && (
                                                        <div className="flex flex-col gap-0.5 mr-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleMove(idx, -1); }}
                                                                disabled={idx === 0}
                                                                className={`p-1 rounded transition-colors ${idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-brand-blue hover:bg-gray-100'}`}
                                                                title="Move Up"
                                                            >
                                                                <ArrowUp size={16} strokeWidth={2} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleMove(idx, 1); }}
                                                                disabled={idx === content.length - 1}
                                                                className={`p-1 rounded transition-colors ${idx === content.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-brand-blue hover:bg-gray-100'}`}
                                                                title="Move Down"
                                                            >
                                                                <ArrowDown size={16} strokeWidth={2} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    {activeTab !== 'messages' && (
                                                        <button onClick={() => openEditor(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="Edit">
                                                            <Edit3 size={18} />
                                                        </button>
                                                    )}
                                                    {activeTab !== 'about' && activeTab !== 'profile' && (
                                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="Delete">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {content.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="py-16 text-center text-gray-400 font-medium text-sm">No records found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {activeTab === 'gallery' && (
                            <div className="mt-12 p-6 bg-gray-50 rounded border border-gray-200">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider text-left">Gallery Categories</h3>
                                </div>
                                <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                                    <input 
                                        className="input flex-1" 
                                        placeholder="Add new category (e.g. Workshop)" 
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                        required
                                    />
                                    <button type="submit" className="bg-gray-800 text-white px-6 py-2 rounded font-bold hover:bg-black transition-all text-sm">
                                        Add
                                    </button>
                                </form>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-gray-200 group">
                                            <span className="text-xs font-bold text-gray-700">{cat.name}</span>
                                            <button 
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete Category"
                                                type="button"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="max-w-3xl mx-auto py-4">
                        <div className="mb-10 text-center border-b pb-8">
                            <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                                {activeTab === 'profile'
                                    ? 'Update Profile'
                                    : formData.id
                                        ? 'Edit Entry'
                                        : 'Add New Entry'}
                            </h2>
                            <p className="text-gray-500 text-sm">
                                {activeTab === 'profile'
                                    ? 'Update your username, email, or password. A 6-digit OTP will be sent to verify the change before it is applied.'
                                    : STRUCTURED_TABS.includes(activeTab)
                                    ? 'Use any fields you want. You can keep them empty, mix title, label + value, and text only, and arrange the content your own way.'
                                    : <>Fill in the fields below. Fields marked with <span className="text-red-500">*</span> are mandatory.</>}
                            </p>
                        </div>
                        {saveError && (
                            <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{saveError}</span>
                            </div>
                        )}
                        <div className="space-y-4">
                            {renderForm()}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 mt-12 justify-center">
                            <button type="submit" disabled={saving} className={`bg-gray-900 hover:bg-black text-white px-10 py-3 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 sm:min-w-[200px] ${saving ? 'opacity-70 cursor-wait' : ''}`}>
                                <Save size={18} /> {saving ? 'Saving...' : activeTab === 'profile' ? (formData.otp_requested ? 'Verify OTP & Update' : 'Send OTP') : formData.id ? 'Update Record' : 'Save Record'}
                            </button>
                            <button type="button" onClick={() => setIsEditing(false)} disabled={saving} className="px-10 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded font-bold text-sm text-gray-600 transition-all sm:min-w-[120px] disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
                        </div>
                    </form>
                )}
            </div>
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />
        </div>
    );
};

export default Dashboard;
