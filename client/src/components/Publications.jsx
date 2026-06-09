import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Download } from 'lucide-react';
import api from '../api';
import StructuredDetails from './StructuredDetails';
import { parseStructuredItems } from '../utils/structuredItems';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedFirstField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { getTransformedUrl, buildSrcSet } from '../utils/imageUrl';

const Publications = () => {
    const [publications, setPublications] = useState([]);
    const [brokenThumbnails, setBrokenThumbnails] = useState([]);
    const [loading, setLoading] = useState(true);
    const { language, t } = useI18n();
    const noDataLabel = getNoDataLabel(language);

    useEffect(() => {
        const fetchPublications = async () => {
            setLoading(true);
            try {
                const res = await api.get('/publications');
                setPublications(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Error fetching publications:', err);
                setPublications([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPublications();
    }, [language]);

    if (loading) return (
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

    const getDoiSuffix = (url) => {
        if (!url || typeof url !== 'string') return null;
        const parts = url.split('doi.org/');
        return parts.length > 1 ? parts[1] : url.replace(/^(https?:\/\/)?(www\.)?/, '');
    };

    return (
        <section id="publications" className="py-16 md:py-24 bg-white">
            <div className="max-w-5xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-xs sm:text-sm">{t('publications.kicker')}</span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-center mb-6 text-[#8c2626] tracking-tight">
                    {language === 'en' ? 'Recent Publications' : t('publications.titleMain')}
                </h2>
                <div className="w-32 h-[1px] bg-gray-200 mx-auto mb-16" />
                
                <div className="space-y-12 md:space-y-16 text-left">
                    {publications.map((item, index) => {
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
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                                className="relative"
                            >
                                {/* Header Section: Image + Meta */}
                                <div className="flex flex-col md:flex-row gap-8 items-start mb-6">
                                    {item.thumbnail_url && !brokenThumbnails.includes(item.id) && (
                                        <div className="w-full md:w-44 flex-shrink-0">
                                            <img 
                                                src={getTransformedUrl(item.thumbnail_url, 320, 75)} 
                                                srcSet={buildSrcSet(item.thumbnail_url)}
                                                sizes="(max-width: 768px) 100vw, 176px"
                                                alt={title} 
                                                loading="lazy"
                                                decoding="async"
                                                width="320"
                                                height="400"
                                                className="w-full h-auto p-1 bg-white border border-gray-200 shadow-sm"
                                                style={{ maxWidth: '100%', height: 'auto' }}
                                                onError={() => setBrokenThumbnails((prev) => [...prev, item.id])}
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 pt-1 text-left">
                                        <h3 className="text-xl sm:text-2xl md:text-[23px] font-medium text-[#2d8da8] leading-snug mb-4">
                                            {titleLink ? (
                                                <a href={titleLink} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#1d6b82] transition-colors">
                                                    {title}
                                                </a>
                                            ) : (
                                                title
                                            )}
                                        </h3>
 
                                        <div className="space-y-2 text-sm sm:text-base text-gray-700">
                                            <p className="leading-relaxed">
                                                <span className="font-bold text-gray-900">{t('publications.journalName')}:</span>{' '}
                                                {item.journal_url ? (
                                                    <a href={item.journal_url} target="_blank" rel="noopener noreferrer" className="text-[#3a96b7] hover:underline font-normal">
                                                        {journalName || t('common.notAvailable')}
                                                    </a>
                                                ) : (
                                                    <span className="text-[#3a96b7] font-normal">{journalName || t('common.notAvailable')}</span>
                                                )}
                                            </p>
                                            <p className="leading-relaxed">
                                                <span className="font-bold text-gray-900">{t('publications.publicationYear')}:</span> <span className="text-gray-600">{item.pub_year || t('common.notAvailable')}</span>
                                            </p>
                                            <p className="leading-relaxed max-w-3xl">
                                                <span className="font-bold text-gray-900">{t('publications.authors')}:</span>{' '}
                                                <span className="text-gray-600">
                                                    {authors ? (
                                                        <span dangerouslySetInnerHTML={{ __html: authors.split(',').map(name => {
                                                            const trimmed = name.trim();
                                                            const isMainAuthor = /Samir|Hossain|Alomgir/i.test(trimmed);
                                                            if (isMainAuthor) {
                                                                return `<span class="underline decoration-[#c2410c]/40 font-bold text-[#c2410c] hover:text-[#9a3412] transition-colors">${trimmed}</span>`;
                                                            }
                                                            return `<span class="text-gray-700">${trimmed}</span>`;
                                                        }).join(', ') }} />
                                                    ) : t('common.notAvailable')}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
 
                                {/* Content Sections */}
                                {detailItems.length > 0 && (
                                    <div className="mt-8">
                                        <StructuredDetails
                                            items={detailItems}
                                            className="space-y-6 text-gray-700 leading-relaxed"
                                            titleClassName="text-[15px] font-black text-gray-900 mt-6 mb-2 text-left uppercase tracking-wider"
                                            textClassName="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed text-justify mb-4 break-words"
                                            pairLabelClassName="text-gray-900 font-bold"
                                            pairValueClassName="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed text-justify mb-4 break-words"
                                            valueStackClassName="space-y-2.5"
                                        />
                                    </div>
                                )}
 
                                {/* Actions */}
                                {(item.link_url || item.file_url) && (
                                    <div className="mt-6 flex flex-wrap justify-start gap-5 pt-4 border-t border-gray-100">
                                        {item.link_url && (
                                            <a 
                                                href={item.link_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2d8da8] hover:text-[#1d6b82] transition-colors"
                                            >
                                                {t('publications.readFullArticle')} <ExternalLink size={14} />
                                            </a>
                                        )}
                                        {item.file_url && (
                                            <a 
                                                href={item.file_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-[#ceb079] text-[#0b3b75] px-4 py-2 rounded hover:bg-white border border-[#ceb079] hover:text-[#ceb079] transition-all shadow-sm"
                                            >
                                                {t('publications.downloadPdf')} <Download size={14} />
                                            </a>
                                        )}
                                    </div>
                                )}
                                
                                {index < publications.length - 1 && (
                                    <hr className="my-16 border-t border-gray-200" />
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Publications;
