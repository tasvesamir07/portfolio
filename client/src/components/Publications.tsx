/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Download, BookOpen } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import StructuredDetails from './StructuredDetails';
import { parseStructuredItems } from '../utils/structuredItems';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedFirstField, localizeNumbers } from '../i18n/localize';
import { usePublicPageData } from '../hooks/useSiteName';
import { getNoDataLabel } from '../utils/publicSectionState';
import { RenderInlineHtml } from '../utils/htmlRenderer';
import OptimizedImage from './OptimizedImage';

import PublicationsSkeleton from '../pages/skeletons/PublicationsSkeleton';

const isFieldEmpty = (html: any) => {
    if (!html) return true;
    const clean = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
    return clean === '' || clean.toLowerCase() === 'n/a';
};

const Publications = () => {
    const prefersReduced = useReducedMotion();
    const [brokenThumbnails, setBrokenThumbnails] = useState<any[]>([]);
    const { language, t } = useI18n();
    const noDataLabel = getNoDataLabel(language);
    const { data: publicData } = usePublicPageData();

    const { data: publications = [], isLoading } = useQuery({
        queryKey: ['publications', language],
        queryFn: async () => {
            const res = await api.get('/publications');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    if (isLoading) return <PublicationsSkeleton />;

    if (publications.length === 0) return (
         <section id="publications" className="py-16 md:py-24 bg-white min-h-[60vh] flex items-center justify-center">
            <div className="max-w-5xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('publications.kicker')}</span>
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('publications.emptyTitleMain')} <span className="text-brand-blue">{t('publications.emptyTitleAccent')}</span> {t('publications.emptyTitleSuffix')}</h1>
                <p className="text-gray-500 font-medium">{noDataLabel}</p>
            </div>
         </section>
    );

    return (
        <section id="publications" className="py-16 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-xs sm:text-sm">{t('publications.kicker')}</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-center mb-6 text-[#8c2626] tracking-tight animate-none">
                    {language === 'en' ? (
                        <>Recent <span className="text-brand-blue font-sans font-black">Publications</span></>
                    ) : (
                        <>{t('publications.titleMain')} <span className="text-brand-blue font-sans font-black">{t('publications.titleAccent')}</span></>
                    )}
                </h1>
                <div className="w-32 h-[1px] bg-gray-200 mx-auto mb-16" />
                
                <div className="grid grid-cols-1 gap-6 md:gap-9 max-w-7xl mx-auto w-full">
                    {publications.map((item) => {
                        let detailItems: any[] = parseStructuredItems(getLocalizedFirstField(item, ['details_json'], language, ''));
                        const title = getLocalizedField(item, 'title', language, item.title);
                        const journalName = getLocalizedField(item, 'journal_name', language, item.journal_name);
                        const authors = getLocalizedField(item, 'authors', language, item.authors);
                        const mainAuthor = getLocalizedField(item, 'main_author', language, item.main_author);
                        const volume = item.volume;
                        const issue = item.issue;
                        const pages = item.pages;
                        const impactFactor = item.impact_factor;
                        const introduction = getLocalizedField(item, 'introduction', language, item.introduction);
                        const methods = getLocalizedField(item, 'methods', language, item.methods);
 
                        if (!detailItems.length) {
                            const legacyItems: any[] = [];
 
                            if (introduction) {
                                legacyItems.push({
                                    id: `${item.id}-introduction-title`,
                                    type: 'title',
                                    title: t('publications.introduction'),
                                    values: [''],
                                    text: ''
                                });
                                parseStructuredItems(introduction).forEach((entry, entryIndex) => {
                                    legacyItems.push({ ...entry, id: `${item.id}-introduction-${entryIndex}` });
                                });
                            }
 
                            if (methods) {
                                legacyItems.push({
                                    id: `${item.id}-methods-title`,
                                    type: 'title',
                                    title: t('publications.methods'),
                                    values: [''],
                                    text: ''
                                });
                                parseStructuredItems(methods).forEach((entry, entryIndex) => {
                                    legacyItems.push({ ...entry, id: `${item.id}-methods-${entryIndex}` });
                                });
                            }
 
                            detailItems = legacyItems;
                        }
 
                        return (
                            <motion.article
                                key={item.id}
                                {...(!prefersReduced ? {
                                    initial: { opacity: 0, y: 30 },
                                    whileInView: { opacity: 1, y: 0 },
                                    viewport: { once: true },
                                    transition: { duration: 0.6 },
                                    whileHover: { scale: 1.02, y: -6 }
                                } : {})}
                                className="group bg-white p-6 md:p-9 rounded-2xl md:rounded-3xl border border-gray-100 transition-all duration-300 shadow-sm motion-card-hover flex flex-col justify-between"
                                style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' }}
                            >
                                <div className="flex-grow flex flex-col justify-start">
                                    <div className="flex flex-col sm:flex-row gap-6 mb-2">
                                        {item.thumbnail_url && !brokenThumbnails.includes(item.id) && (
                                            <div className="w-full sm:w-44 sm:h-56 h-48 overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center border border-gray-200/60 shrink-0 shadow-sm">
                                                <OptimizedImage 
                                                    src={item.thumbnail_url}
                                                    alt={title} 
                                                    width={180}
                                                    height={240}
                                                    sizes="(max-width: 640px) 100vw, 180px"
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    onError={() => setBrokenThumbnails((prev) => [...prev, item.id])}
                                                />
                                            </div>
                                        )}
                                        <div className="text-left flex-grow flex flex-col justify-center">
                                            <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug mb-4">
                                                <RenderInlineHtml html={title} />
                                            </h3>
 
                                            <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                                                {(!isFieldEmpty(mainAuthor) || !isFieldEmpty(authors)) && (
                                                    <p className="leading-relaxed">
                                                        <span className="font-bold text-gray-900">{t('publications.authors') || 'Authors'}:</span>{' '}
                                                        {!isFieldEmpty(mainAuthor) && (
                                                            <strong className="text-gray-900 [&_p]:inline [&_div]:inline [&_ul]:inline [&_li]:inline [&_ol]:inline [&_ul]:p-0 [&_ul]:m-0 [&_li]:p-0 [&_li]:m-0 [&_li]:list-none">
                                                                <RenderInlineHtml html={mainAuthor} />*
                                                            </strong>
                                                        )}
                                                        {!isFieldEmpty(mainAuthor) && !isFieldEmpty(authors) && <span>, </span>}
                                                        {!isFieldEmpty(authors) && (
                                                            <span className="[&_p]:inline [&_div]:inline [&_ul]:inline [&_li]:inline [&_ol]:inline [&_ul]:p-0 [&_ul]:m-0 [&_li]:p-0 [&_li]:m-0 [&_li]:list-none [&_li:not(:last-child)]:after:content-[',_'] [&_a]:text-[#3a96b7] [&_a]:hover:underline [&_a]:font-semibold">
                                                                <RenderInlineHtml html={authors} />
                                                            </span>
                                                        )}
                                                    </p>
                                                )}
                                                {(!isFieldEmpty(journalName) || !isFieldEmpty(item.pub_year) || !isFieldEmpty(volume) || !isFieldEmpty(issue) || !isFieldEmpty(pages) || !isFieldEmpty(impactFactor)) && (
                                                    <p className="leading-relaxed text-xs sm:text-sm text-gray-600">
                                                        {!isFieldEmpty(journalName) && (
                                                            <>
                                                                {item.journal_url ? (
                                                                    <a href={item.journal_url} target="_blank" rel="noopener noreferrer" className="text-[#3a96b7] hover:underline font-semibold italic">
                                                                        <RenderInlineHtml html={journalName} />
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-[#3a96b7] font-semibold italic">
                                                                        <RenderInlineHtml html={journalName} />
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                        {!isFieldEmpty(item.pub_year) && (
                                                            <>
                                                                {!isFieldEmpty(journalName) && ' '}
                                                                <span className="[&_p]:inline [&_div]:inline"><RenderInlineHtml html={localizeNumbers(item.pub_year, language)} /></span>
                                                            </>
                                                        )}
                                                        {(!isFieldEmpty(volume) || !isFieldEmpty(issue) || !isFieldEmpty(pages)) && (
                                                            <>
                                                                {(!isFieldEmpty(journalName) || !isFieldEmpty(item.pub_year)) && '; '}
                                                                {!isFieldEmpty(volume) && (
                                                                    <span className="font-bold text-gray-900 [&_p]:inline [&_div]:inline"><RenderInlineHtml html={localizeNumbers(volume, language)} /></span>
                                                                )}
                                                                {!isFieldEmpty(issue) && (
                                                                    <span className="text-gray-600 [&_p]:inline [&_div]:inline">
                                                                        {!isFieldEmpty(volume) && ' '}(<RenderInlineHtml html={localizeNumbers(issue, language)} />)
                                                                    </span>
                                                                )}
                                                                {!isFieldEmpty(pages) && (
                                                                    <>
                                                                        {(!isFieldEmpty(volume) || !isFieldEmpty(issue)) && ': '}
                                                                        <span className="[&_p]:inline [&_div]:inline"><RenderInlineHtml html={localizeNumbers(pages, language)} /></span>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                        {!isFieldEmpty(impactFactor) && (
                                                            <>
                                                                {(() => {
                                                                    const cleanIF = impactFactor.trim();
                                                                    const hasLabelOrBrackets = cleanIF.toLowerCase().includes('if:') || 
                                                                                               cleanIF.startsWith('[') || 
                                                                                               /q[1-4]/i.test(cleanIF);
                                                                    if (hasLabelOrBrackets) {
                                                                        const formatted = cleanIF.startsWith('[') && cleanIF.endsWith(']') ? cleanIF : `[${cleanIF}]`;
                                                                        return (
                                                                            <span className="font-semibold text-brand-gold ml-1.5 [&_p]:inline [&_div]:inline">
                                                                                {' '}<RenderInlineHtml html={localizeNumbers(formatted, language)} />
                                                                            </span>
                                                                        );
                                                                    } else {
                                                                        return (
                                                                            <span className="font-semibold text-brand-gold ml-1.5 [&_p]:inline [&_div]:inline">
                                                                                {' '}[IF: <RenderInlineHtml html={localizeNumbers(cleanIF, language)} />]
                                                                            </span>
                                                                        );
                                                                    }
                                                                })()}
                                                            </>
                                                        )}
                                                    </p>
                                                )}
                                                {(!isFieldEmpty(item.doi) || !isFieldEmpty(item.doi_url)) && (
                                                    <p className="leading-relaxed">
                                                        <span className="font-bold text-gray-900">{t('publications.doi') || 'DOI'}:</span>{' '}
                                                        {(() => {
                                                            const doiUrl = item.doi_url || (item.doi ? `https://doi.org/${item.doi.trim().replace(/<[^>]*>/g, '')}` : '');
                                                            const cleanDoi = item.doi ? item.doi.replace(/<[^>]*>/g, '') : '';
                                                            const doiText = cleanDoi || (item.doi_url ? (() => {
                                                                const match = item.doi_url.match(/(10\.\d{4,9}\/[^\s]+)/i);
                                                                return match ? match[1] : item.doi_url;
                                                            })() : '');
                                                            return doiUrl ? (
                                                                <a 
                                                                    href={doiUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    className="text-[#3a96b7] hover:underline font-semibold break-all"
                                                                >
                                                                    {doiText}
                                                                </a>
                                                            ) : (
                                                                <span className="text-gray-600 font-medium break-all">
                                                                    {doiText}
                                                                </span>
                                                            );
                                                        })()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
 
                                    {/* Content Sections */}
                                    {detailItems.length > 0 && (
                                        <div className="mt-4 pt-6 border-t border-gray-100">
                                            <StructuredDetails
                                                items={detailItems}
                                                className="space-y-6 text-gray-700 leading-relaxed"
                                                titleClassName="text-sm font-black text-gray-900  mt-6 mb-2 text-left uppercase tracking-wider animate-none"
                                                textClassName="text-[14px] text-gray-600  leading-relaxed text-left mb-3 break-words"
                                                pairLabelClassName="text-gray-900  font-bold"
                                                pairValueClassName="text-[14px] text-gray-600  leading-relaxed text-left mb-3 break-words"
                                                valueStackClassName="space-y-2"
                                            />
                                        </div>
                                    )}
                                </div>
 
                                {/* Actions */}
                                {(item.link_url || item.file_url) && (
                                    <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 w-full justify-end items-center">
                                        {item.link_url && (
                                            <a 
                                                href={item.link_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2d8da8] hover:text-[#1d6b82] transition-colors w-full sm:w-auto justify-center sm:justify-start"
                                            >
                                                {t('publications.readFullArticle')} <ExternalLink size={14} />
                                            </a>
                                        )}
                                        {item.file_url && (
                                            <a 
                                                href={item.file_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#ceb079] text-[#0b3b75] px-5 py-2.5 rounded hover:bg-[#0b3b75] hover:text-white transition-all shadow-sm w-full sm:w-auto justify-center"
                                            >
                                                {t('publications.downloadPdf')} <Download size={14} />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </motion.article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default React.memo(Publications);
