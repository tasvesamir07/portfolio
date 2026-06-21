import React, { useMemo } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { getTransformedUrl } from '../utils/imageUrl';
import {
    isContactLabel,
    toHref,
    extractHighlights,
    extractBioBlocks,
    looksLikeContact,
    splitContactValues
} from '../utils/aboutHelpers';
import { sanitizeStructuredInlineHtml as sanitizeInlineHtml } from '../utils/structuredItems';

const About = ({ data }) => {
    const { language, t } = useI18n();
    const { name, hero_image_url, sub_bio, bio_text, resume_url } = data || {};

    const localizedName = getLocalizedField(data, 'name', language, name);
    const localizedSubBio = getLocalizedField(data, 'sub_bio', language, sub_bio);
    const localizedBioText = getLocalizedField(data, 'bio_text', language, bio_text);
    const highlightItems = useMemo(() => extractHighlights(localizedSubBio), [localizedSubBio]);
    const bioBlocks = useMemo(() => extractBioBlocks(localizedBioText), [localizedBioText]);

    const translatedHighlightItems = highlightItems;
    const translatedBioBlocks = bioBlocks;

    const highlightTextStyle = {
        fontSize: 'clamp(1.05rem, 0.95rem + 0.55vw, 1.45rem)',
        lineHeight: '1.4'
    };

    const highlightListStyle = {
        rowGap: '1.1rem'
    };

    if (!data) return null;

    return (
        <section className="bg-white py-12 md:py-16 w-full shadow-md z-20 relative -mt-4 text-left" id="about">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 overflow-x-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] gap-8 md:gap-12 lg:gap-14 items-start lg:items-stretch">
                    <div className="w-full flex justify-center lg:justify-start">
                        <div className="w-full max-w-[260px] sm:max-w-[300px] lg:max-w-[320px] pt-3 pb-5">
                            <div className="bg-white p-2 rounded-sm shadow-2xl border border-gray-100 aspect-[3/4] overflow-hidden hover-glow">
                                <img
                                    src={getTransformedUrl(hero_image_url, 320, 75) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'}
                                    alt={localizedName || 'Profile'}
                                    width="320"
                                    height="426"
                                    fetchpriority="high"
                                    className="w-full h-full object-cover object-top filter contrast-105 pointer-events-none select-none"
                                    style={{ maxWidth: '100%', height: 'auto' }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d';
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-full min-w-0 flex flex-col justify-center">
                        <div
                            className="w-full min-w-0 border-l-4 sm:border-l-[6px] border-[#ceb079] pl-4 sm:pl-6 lg:pl-8 xl:pl-10 py-1 sm:py-2 overflow-hidden"
                        >
                            {translatedHighlightItems.length > 0 && (
                                <ul className="flex flex-col w-full min-w-0" style={highlightListStyle}>
                                    {translatedHighlightItems.map((item, i) => {
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
                                                                            className="inline-block w-fit min-w-0 max-w-full self-start text-[#0ea5e9] font-bold break-words [overflow-wrap:anywhere] [word-break:break-all] underline decoration-current/60 underline-offset-4 transition-colors hover:text-[#0284c7]"
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
                        </div>
                    </div>
                </div>

                {translatedBioBlocks.length > 0 && (
                    <div className="mt-16 md:mt-24 pt-8 md:pt-12 border-t border-gray-100">
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
                                {translatedBioBlocks.map((block, index) => {
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
                    </div>
                )}
            </div>
        </section>
    );
};

export default About;
