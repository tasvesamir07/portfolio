import React, { useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';

const About = ({ data }) => {
    const { language, t } = useI18n();
    const { name, hero_image_url, sub_bio, bio_text, resume_url } = data || {};
    const imageColumnRef = useRef(null);
    const highlightPanelRef = useRef(null);
    const highlightListRef = useRef(null);

    const isHTML = (str) => /<[a-z][\s\S]*>/i.test(str);
    const normalizeText = (value = '') =>
        value
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const extractPlainText = (value = '') => {
        if (!value) return '';
        if (!/<[a-z][\s\S]*>/i.test(value) || typeof window === 'undefined') {
            return normalizeText(value);
        }

        return normalizeText(new DOMParser().parseFromString(value, 'text/html').body.textContent || '');
    };

    const escapeHtml = (value = '') =>
        value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const sanitizeInlineHtml = (html = '') => {
        if (!html) return '';

        if (!/<[a-z][\s\S]*>/i.test(html) || typeof window === 'undefined') {
            return escapeHtml(html);
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
            if (tag === 'a') {
                const href = normalizeHref(node.getAttribute('href') || node.textContent || '');
                return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${children || escapeHtml(node.textContent || href)}</a>` : children;
            }

            return children;
        };

        return Array.from(doc.body.childNodes).map(serializeNode).join('');
    };

    const isContactLabel = (label = '') => {
        const normalized = label.trim().toLowerCase();
        return normalized.includes('email')
            || normalized.includes('website')
            || normalized.includes('\uC774\uBA54\uC77C')
            || normalized.includes('\uC6F9\uC0AC\uC774\uD2B8')
            || normalized.includes('\u0987\u09AE\u09C7\u0987\u09B2')
            || normalized.includes('\u0993\u09DF\u09C7\u09AC\u09B8\u09BE\u0987\u099F')
            || normalized.includes('\u0993\u09AF\u09BC\u09C7\u09AC\u09B8\u09BE\u0987\u099F');
    };

    const looksLikeContact = (value = '') => /@|(?:https?:\/\/|www\.)/i.test(value);

    const toHref = (value) => {
        if (!value) return '#';
        if (value.includes('@') && !value.startsWith('mailto:')) {
            return `mailto:${value}`;
        }
        if (!/^https?:\/\//i.test(value)) {
            return `https://${value}`;
        }
        return value;
    };

    const splitContactValues = (value = '') =>
        (() => {
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
        })();

    const extractHighlights = (content = '') => {
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

    const extractBioBlocks = (content = '') => {
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

    const localizedName = getLocalizedField(data, 'name', language, name);
    const localizedSubBio = getLocalizedField(data, 'sub_bio', language, sub_bio);
    const localizedBioText = getLocalizedField(data, 'bio_text', language, bio_text);
    const highlightItems = extractHighlights(localizedSubBio);
    const bioBlocks = extractBioBlocks(localizedBioText);

    const highlightTextStyle = {
        fontSize: 'var(--about-highlight-font-size, clamp(1.08rem, 1rem + 0.85vw, 1.7rem))',
        lineHeight: 'var(--about-highlight-line-height, 1.22)'
    };

    const highlightListStyle = {
        rowGap: 'var(--about-highlight-gap, 0.9rem)'
    };

    useLayoutEffect(() => {
        const imageColumn = imageColumnRef.current;
        const panel = highlightPanelRef.current;
        const list = highlightListRef.current;

        if (!imageColumn || !panel || !list) return;

        const syncPanelHeight = () => {
            if (window.innerWidth < 1024) {
                panel.style.removeProperty('min-height');
                panel.style.removeProperty('max-height');
                panel.style.setProperty('--about-highlight-font-size', 'clamp(1.08rem, 1rem + 0.85vw, 1.7rem)');
                panel.style.setProperty('--about-highlight-gap', '0.9rem');
                panel.style.setProperty('--about-highlight-line-height', '1.24');
                list.style.removeProperty('height');
                list.style.removeProperty('justify-content');
                list.style.removeProperty('row-gap');
                return;
            }

            const imageHeight = imageColumn.getBoundingClientRect().height;
            const itemCount = Math.max(highlightItems.length, 1);

            if (imageHeight > 0) {
                const exactHeight = `${Math.ceil(imageHeight)}px`;
                panel.style.minHeight = exactHeight;
                panel.style.maxHeight = exactHeight;
            }

            const availableHeight = Math.max(imageHeight - 6, 0);
            let low = 20;
            let high = 38;
            let bestFont = low;
            let bestHeight = Infinity;

            const measureHeight = (fontPx) => {
                panel.style.setProperty('--about-highlight-font-size', `${fontPx}px`);
                panel.style.setProperty('--about-highlight-gap', '0px');
                panel.style.setProperty('--about-highlight-line-height', '1.16');
                list.style.height = 'auto';
                list.style.justifyContent = 'flex-start';
                list.style.rowGap = '0px';
                return list.scrollHeight;
            };

            while (high - low > 0.5) {
                const mid = (low + high) / 2;
                const measuredHeight = measureHeight(mid);

                if (measuredHeight <= availableHeight) {
                    bestFont = mid;
                    bestHeight = measuredHeight;
                    low = mid;
                } else {
                    high = mid;
                }
            }

            const fittedHeight = Number.isFinite(bestHeight) ? bestHeight : measureHeight(bestFont);
            const remainingSpace = Math.max(availableHeight - fittedHeight, 0);
            const distributedGap = itemCount > 1
                ? Math.max(0, Math.min(18, remainingSpace / (itemCount - 1)))
                : 0;

            panel.style.setProperty('--about-highlight-font-size', `${bestFont}px`);
            panel.style.setProperty('--about-highlight-gap', `${distributedGap}px`);
            panel.style.setProperty('--about-highlight-line-height', '1.16');
            list.style.height = `${availableHeight}px`;
            list.style.justifyContent = 'space-between';
            list.style.rowGap = '0px';
        };

        syncPanelHeight();

        const resizeObserver = new ResizeObserver(() => {
            syncPanelHeight();
        });

        resizeObserver.observe(imageColumn);
        resizeObserver.observe(panel);
        resizeObserver.observe(list);
        window.addEventListener('resize', syncPanelHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', syncPanelHeight);
            panel.style.removeProperty('min-height');
            panel.style.removeProperty('max-height');
            panel.style.removeProperty('--about-highlight-font-size');
            panel.style.removeProperty('--about-highlight-gap');
            panel.style.removeProperty('--about-highlight-line-height');
            list.style.removeProperty('height');
            list.style.removeProperty('justify-content');
            list.style.removeProperty('row-gap');
        };
    }, [hero_image_url, localizedSubBio, language, highlightItems.length]);

    if (!data) return null;

    return (
        <section className="bg-white py-12 md:py-16 w-full shadow-md z-20 relative -mt-4 text-left" id="about">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 overflow-x-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] gap-8 md:gap-12 lg:gap-14 items-start lg:items-stretch">
                    <div ref={imageColumnRef} className="w-full flex justify-center lg:justify-start">
                        <div className="w-full max-w-[260px] sm:max-w-[300px] lg:max-w-[320px] pt-3 pb-5">
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                            >
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                                    className="bg-white p-2 rounded-sm shadow-2xl border border-gray-100 aspect-[3/4] overflow-hidden"
                                >
                                    <img
                                        src={hero_image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'}
                                        alt={localizedName || 'Profile'}
                                        className="w-full h-full object-cover object-top filter contrast-105"
                                    />
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>

                    <div className="w-full min-w-0">
                        <motion.div
                            initial={{ opacity: 0, x: 25 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            ref={highlightPanelRef}
                            className="w-full min-w-0 border-l-4 sm:border-l-[6px] border-[#ceb079] pl-4 sm:pl-6 lg:pl-8 xl:pl-10 py-1 sm:py-2 overflow-hidden lg:flex lg:flex-col lg:justify-start"
                        >
                            {highlightItems.length > 0 && (
                                <ul ref={highlightListRef} className="flex flex-col w-full min-w-0" style={highlightListStyle}>
                                    {highlightItems.map((item, i) => {
                                        const point = item.text;
                                        const label = item.kind === 'pair'
                                            ? item.label
                                            : (point.includes(':') ? point.split(':')[0].trim() : '');
                                        const value = item.kind === 'pair'
                                            ? item.linkedValues.join(' ')
                                            : (point.includes(':') ? point.split(':').slice(1).join(':').trim() : point.trim());
                                        const isContact = item.kind === 'pair'
                                            ? item.linkedValues.length > 0
                                            : (isContactLabel(label) || looksLikeContact(value));
                                        const contactValues = isContact
                                            ? (item.linkedValues.length > 0 ? item.linkedValues : splitContactValues(value))
                                            : [];

                                        return (
                                            <li key={i} className="grid grid-cols-[12px_minmax(0,1fr)] sm:grid-cols-[14px_minmax(0,1fr)] gap-3 sm:gap-4 items-start min-w-0">
                                                <div className="w-2.5 h-2.5 mt-2 bg-[#ceb079] rotate-45" />
                                                <div className="min-w-0 max-w-full space-y-1">
                                                    {label ? (
                                                        <div className="flex flex-col sm:grid sm:grid-cols-[max-content_minmax(0,1fr)] items-start gap-x-3 gap-y-1 sm:gap-y-2 min-w-0 max-w-full">
                                                            <span className="text-[#0b3b75] font-extrabold sm:whitespace-nowrap pr-1.5" style={highlightTextStyle}>
                                                                {label}:
                                                            </span>
                                                            {isContact ? (
                                                                <div className="min-w-0 max-w-full flex flex-col items-start gap-y-3 pt-0.5">
                                                                    {contactValues.map((contactValue, itemIndex) => (
                                                                        <a
                                                                            key={`${contactValue}-${itemIndex}`}
                                                                            href={toHref(contactValue)}
                                                                            target={contactValue.includes('@') ? undefined : '_blank'}
                                                                            rel={contactValue.includes('@') ? undefined : 'noopener noreferrer'}
                                                                            className="inline-block w-fit min-w-0 max-w-full self-start text-[#0ea5e9] font-bold break-words underline decoration-current/60 underline-offset-4 transition-colors hover:text-[#0284c7]"
                                                                            style={highlightTextStyle}
                                                                        >
                                                                            {contactValue}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="min-w-0 max-w-full flex flex-col gap-y-2 pt-0.5">
                                                                    {(item.valueHtmls || [sanitizeInlineHtml(value)]).map((valueHtml, valueIndex) => (
                                                                        <span
                                                                            key={`${i}-value-${valueIndex}`}
                                                                            className="text-[#334155] font-semibold break-words"
                                                                            style={highlightTextStyle}
                                                                            dangerouslySetInnerHTML={{ __html: valueHtml }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p
                                                            className={`min-w-0 max-w-full ${isContact ? 'text-[#0ea5e9] font-bold break-words' : 'text-[#334155] font-semibold break-words'}`}
                                                            style={highlightTextStyle}
                                                            dangerouslySetInnerHTML={{ __html: item.textHtml || sanitizeInlineHtml(point) }}
                                                        />
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </motion.div>
                    </div>
                </div>

                {bioBlocks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mt-16 md:mt-24 pt-8 md:pt-12 border-t border-gray-100"
                    >
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 md:mb-12">
                            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 tracking-tight uppercase leading-tight break-words max-w-full">
                                {t('about.short')} <span className="text-gray-400">{t('about.biography')}</span>
                            </h3>
                            {resume_url && (
                                <a
                                    href={resume_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-full sm:w-auto justify-center bg-[#0b3b75] text-white px-6 md:px-10 py-3 md:py-4 font-bold uppercase tracking-[0.18em] text-[10px] md:text-xs hover:bg-black transition-all shadow-md hover:-translate-y-1"
                                >
                                    {t('about.downloadFullCv')}
                                </a>
                            )}
                        </div>

                        <div className="w-full max-w-none min-w-0 overflow-hidden">
                            <div className="w-full max-w-none min-w-0 text-gray-600 text-[clamp(1rem,0.95rem+0.3vw,1.22rem)] leading-[1.9] font-medium">
                                {bioBlocks.map((block, index) => {
                                    if (block.type === 'ul' || block.type === 'ol') {
                                        const ListTag = block.type;
                                        return (
                                            <ListTag
                                                key={`${block.type}-${index}`}
                                                className={`${block.type === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 sm:pl-6 mb-5 space-y-2`}
                                            >
                                                {block.items.map((blockItem, itemIndex) => (
                                                    <li key={`${blockItem}-${itemIndex}`} className="break-words">
                                                        {blockItem}
                                                    </li>
                                                ))}
                                            </ListTag>
                                        );
                                    }

                                    return (
                                        <p key={`${block.type}-${index}`} className="mb-5 break-words last:mb-0">
                                            {block.text}
                                        </p>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </section>
    );
};

export default About;
