import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import StructuredDetails from './StructuredDetails';
import { parseStructuredItems } from '../utils/structuredItems';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedFirstField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { getTransformedUrl, buildSrcSet } from '../utils/imageUrl';

const Publications = () => {
    const [brokenThumbnails, setBrokenThumbnails] = useState([]);
    const { language, t } = useI18n();
    const noDataLabel = getNoDataLabel(language);

    const { data: publications = [], isLoading } = useQuery({
        queryKey: ['publications', language],
        queryFn: async () => {
            const res = await api.get('/publications');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    if (isLoading) return (
         <section id="publications" className="py-16 md:py-24 bg-white min-h-[60vh] flex items-center justify-center">
            <div className="max-w-5xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('publications.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('common.loading')}</h2>
            </div>
         </section>
    );

    if (publications.length === 0) return (
         <section id="publications" className="py-16 md:py-24 bg-white min-h-[60vh] flex items-center justify-center">
            <div className="max-w-5xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('publications.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('publications.emptyTitleMain')} <span className="text-brand-blue">{t('publications.emptyTitleAccent')}</span> {t('publications.emptyTitleSuffix')}</h2>
                <p className="text-gray-500 font-medium">{noDataLabel}</p>
            </div>
         </section>
    );

    const renderAuthors = (authorsStr) => {
        if (!authorsStr) return t('common.notAvailable');

        const authorArray = authorsStr.split(',');
        return (
            <>
                {authorArray.map((name, idx) => {
                    const trimmed = name.trim();
                    if (!trimmed) return null;
                    const isMainAuthor = /Samir|Hossain|Alomgir/i.test(trimmed);
                    const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(trimmed)}`;

                    return (
                        <React.Fragment key={idx}>
                            {idx > 0 && <span className="text-gray-500">, </span>}
                            <a
                                href={searchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`hover:underline transition-colors ${
                                    isMainAuthor 
                                        ? 'font-bold text-[#c2410c] hover:text-[#9a3412] decoration-[#c2410c]/40' 
                                        : 'text-gray-700 hover:text-brand-blue'
                                }`}
                            >
                                {trimmed}
                            </a>
                        </React.Fragment>
                    );
                })}
            </>
        );
    };

    return (
        <section id="publications" className="py-16 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-xs sm:text-sm">{t('publications.kicker')}</span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-center mb-6 text-[#8c2626] tracking-tight">
                    {language === 'en' ? 'Recent Publications' : t('publications.titleMain')}
                </h2>
                <div className="w-32 h-[1px] bg-gray-200 mx-auto mb-16" />
                
                <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                    {publications.map((item) => {
                        let detailItems = parseStructuredItems(getLocalizedFirstField(item, ['details_json'], language, ''));
                        const title = getLocalizedField(item, 'title', language, item.title);
                        const journalName = getLocalizedField(item, 'journal_name', language, item.journal_name);
                        const authors = getLocalizedField(item, 'authors', language, item.authors);
                        const introduction = getLocalizedField(item, 'introduction', language, item.introduction);
                        const methods = getLocalizedField(item, 'methods', language, item.methods);
 
                        if (!detailItems.length) {
                            const legacyItems = [];
 
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
 
                        const titleLink = item.doi_url || item.link_url;
 
                        return (
                            <motion.article
                                key={item.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                                whileHover={{ scale: 1.02, y: -6 }}
                                className="group bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm motion-card-hover flex flex-col justify-between cursor-pointer"
                            >
                                <div className="flex-grow flex flex-col justify-start">
                                    {/* Header Section: Image + Meta */}
                                    <div className="flex flex-col sm:flex-row gap-6 mb-2">
                                        {item.thumbnail_url && !brokenThumbnails.includes(item.id) && (
                                            <div className="w-full sm:w-44 sm:h-56 h-48 overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center border border-gray-200/60 shrink-0 shadow-sm">
                                                <img 
                                                    src={getTransformedUrl(item.thumbnail_url, 240, 75)} 
                                                    srcSet={buildSrcSet(item.thumbnail_url)}
                                                    sizes="(max-width: 640px) 100vw, 180px"
                                                    alt={title} 
                                                    loading="lazy"
                                                    decoding="async"
                                                    width="180"
                                                    height="240"
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    onError={() => setBrokenThumbnails((prev) => [...prev, item.id])}
                                                />
                                            </div>
                                        )}
                                        <div className="text-left flex-grow flex flex-col justify-center">
                                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mb-4">
                                                {titleLink ? (
                                                    <a href={titleLink} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#2d8da8] transition-colors">
                                                        {title}
                                                    </a>
                                                ) : (
                                                    <span>{title}</span>
                                                )}
                                            </h3>
 
                                            <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                                                <p className="leading-relaxed">
                                                    <span className="font-bold text-gray-900">{t('publications.journalName')}:</span>{' '}
                                                    {item.journal_url ? (
                                                        <a href={item.journal_url} target="_blank" rel="noopener noreferrer" className="text-[#3a96b7] hover:underline font-semibold">
                                                            {journalName || t('common.notAvailable')}
                                                        </a>
                                                    ) : (
                                                        <span className="text-[#3a96b7] font-semibold">{journalName || t('common.notAvailable')}</span>
                                                    )}
                                                </p>
                                                <p className="leading-relaxed">
                                                    <span className="font-bold text-gray-900">{t('publications.publicationYear')}:</span> <span className="text-gray-600 font-medium">{item.pub_year || t('common.notAvailable')}</span>
                                                </p>
                                                <p className="leading-relaxed">
                                                    <span className="font-bold text-gray-900">{t('publications.authors')}:</span>{' '}
                                                    <span className="text-gray-600 font-medium">
                                                        {renderAuthors(authors)}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
 
                                    {/* Content Sections */}
                                    {detailItems.length > 0 && (
                                        <div className="mt-4 pt-6 border-t border-gray-100">
                                            <StructuredDetails
                                                items={detailItems}
                                                className="space-y-6 text-gray-700 leading-relaxed"
                                                titleClassName="text-sm font-black text-gray-900 mt-6 mb-2 text-left uppercase tracking-wider animate-none"
                                                textClassName="text-[14px] text-gray-600 leading-relaxed text-left mb-3 break-words"
                                                pairLabelClassName="text-gray-900 font-bold"
                                                pairValueClassName="text-[14px] text-gray-600 leading-relaxed text-left mb-3 break-words"
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

export default Publications;
