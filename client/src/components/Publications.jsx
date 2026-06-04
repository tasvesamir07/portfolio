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
        <section id="publications" className="py-16 md:py-24 bg-[#fcfaf7]">
            <div className="max-w-5xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('publications.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-10 md:mb-16 text-gray-900 tracking-tight">{t('publications.titleMain')} <span className="text-brand-blue">{t('publications.titleAccent')}</span></h2>
                
                <div className="space-y-8 md:space-y-12">
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
                                className="relative hover-glow bg-white p-6 sm:p-8 md:p-10 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                            >
                            {/* Header Section: Image + Meta */}
                            <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                                {item.thumbnail_url && !brokenThumbnails.includes(item.id) && (
                                    <div className="w-full md:w-64 flex-shrink-0">
                                        <img 
                                            src={getTransformedUrl(item.thumbnail_url, 320, 75)} 
                                            srcSet={buildSrcSet(item.thumbnail_url)}
                                            sizes="(max-width: 768px) 100vw, 256px"
                                            alt={title} 
                                            loading="lazy"
                                            decoding="async"
                                            width="320"
                                            height="400"
                                            className="w-full h-auto rounded-xl shadow border border-gray-100"
                                            style={{ maxWidth: '100%', height: 'auto' }}
                                            onError={() => setBrokenThumbnails((prev) => [...prev, item.id])}
                                        />
                                    </div>
                                )}
                                <div className="flex-1 pt-1 text-left">
                                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-[#000] leading-tight mb-3">
                                        {titleLink ? (
                                            <a href={titleLink} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#0b3b75] transition-colors">
                                                {title}
                                            </a>
                                        ) : (
                                            title
                                        )}
                                    </h3>

                                    {item.doi_url && (
                                        <div className="mb-4">
                                            <a 
                                                href={item.doi_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ceb079]/10 text-[#ceb079] hover:bg-[#ceb079] hover:text-white rounded-md text-xs font-black border border-[#ceb079]/20 transition-all uppercase tracking-wider"
                                            >
                                                DOI: {getDoiSuffix(item.doi_url)}
                                            </a>
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2 text-sm sm:text-base text-gray-700">
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
                                            <span className="font-bold text-gray-900">{t('publications.publicationYear')}:</span> <span className="text-gray-600">{item.pub_year || t('common.notAvailable')}</span>
                                        </p>
                                        <p className="leading-relaxed max-w-2xl">
                                            <span className="font-bold text-gray-900">{t('publications.authors')}:</span> <span className="text-gray-600">{authors ? (
                                                <span dangerouslySetInnerHTML={{ __html: authors.split(',').map(name => 
                                                    name.trim().includes('Samir') || name.trim().includes('Hossain') 
                                                    ? `<span class="underline decoration-brand-blue/80 font-bold text-gray-900">${name.trim()}</span>` 
                                                    : name.trim()
                                                ).join(', ') }} />
                                            ) : t('common.notAvailable')}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Content Sections */}
                            {detailItems.length > 0 && (
                                <div className="border-t border-gray-100 pt-6">
                                    <StructuredDetails
                                        items={detailItems}
                                        className="space-y-6 text-gray-700 leading-relaxed"
                                        titleClassName="text-lg font-bold text-black"
                                        textClassName="text-sm sm:text-base text-gray-600 leading-7 break-words"
                                        pairLabelClassName="text-black font-semibold"
                                        pairValueClassName="text-sm sm:text-base text-gray-600 leading-7 break-words"
                                        valueStackClassName="space-y-2.5"
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-6 flex flex-wrap justify-start gap-4 pt-6 border-t border-gray-100">
                                {item.link_url && (
                                    <a 
                                        href={item.link_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#0891b2] hover:text-cyan-700 transition-all"
                                    >
                                        {t('publications.readFullArticle')} <ExternalLink size={14} />
                                    </a>
                                )}
                                {item.file_url && (
                                    <a 
                                        href={item.file_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] bg-[#ceb079] text-white px-5 py-2.5 rounded hover:bg-[#b89a65] transition-all shadow"
                                    >
                                        {t('publications.downloadPdf')} <Download size={14} />
                                    </a>
                                )}
                            </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Publications;
