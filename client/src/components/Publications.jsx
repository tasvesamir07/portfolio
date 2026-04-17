import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Download } from 'lucide-react';
import api from '../api';
import StructuredDetails from './StructuredDetails';
import { parseStructuredItems } from '../utils/structuredItems';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedFirstField } from '../i18n/localize';
import { useTranslatedDataRows } from '../utils/useTranslatedDataRows';

const Publications = () => {
    const [publications, setPublications] = useState([]);
    const { language, t } = useI18n();
    const translatedPublications = useTranslatedDataRows(publications, ['title', 'journal_name', 'authors', 'introduction', 'methods'], language);

    useEffect(() => {
        const fetchPublications = async () => {
            try {
                const res = await api.get('/publications');
                setPublications(res.data);
            } catch (err) {
                console.error('Error fetching publications:', err);
            }
        };
        fetchPublications();
    }, [language]);

    if (publications.length === 0) return (
         <section id="publications" className="py-16 md:py-24 bg-white min-h-[60vh] flex items-center justify-center">
            <div className="max-w-5xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('publications.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('publications.emptyTitleMain')} <span className="text-brand-blue">{t('publications.emptyTitleAccent')}</span> {t('publications.emptyTitleSuffix')}</h2>
            </div>
         </section>
    );

    return (
        <section id="publications" className="py-16 md:py-24 bg-white">
            <div className="max-w-5xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('publications.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-10 md:mb-16 text-gray-900 tracking-tight">{t('publications.titleMain')} <span className="text-brand-blue">{t('publications.titleAccent')}</span></h2>
                
                <div className="space-y-16 md:space-y-32">
                    {translatedPublications.map((item, index) => {
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

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                                className="relative"
                            >
                            {/* Header Section: Image + Meta */}
                            <div className="flex flex-col md:flex-row gap-8 items-start mb-10">
                                {item.thumbnail_url && (
                                    <div className="w-full md:w-80 flex-shrink-0">
                                        <img 
                                            src={item.thumbnail_url} 
                                            alt={title} 
                                            className="w-full h-auto rounded-xl shadow-lg border border-gray-100"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 pt-1 text-center md:text-left">
                                    <h3 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-[#000] leading-[1.1] mb-6">
                                        {title}
                                    </h3>
                                    
                                    <div className="space-y-3 text-base md:text-[1.1rem]">
                                        <p className="text-gray-900 leading-none">
                                            <span className="font-bold">{t('publications.journalName')}:</span> <span className="text-[#3a96b7]">{journalName || t('common.notAvailable')}</span>
                                        </p>
                                        <p className="text-gray-900 leading-none">
                                            <span className="font-bold">{t('publications.publicationYear')}:</span> <span className="text-[#4b5563]">{item.pub_year || t('common.notAvailable')}</span>
                                        </p>
                                        <p className="text-gray-900 leading-relaxed max-w-2xl mx-auto md:mx-0">
                                            <span className="font-bold">{t('publications.authors')}:</span> <span className="text-[#4b5563]">{authors ? (
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
                            <StructuredDetails
                                items={detailItems}
                                className="space-y-8 text-gray-800 leading-relaxed"
                                titleClassName="text-xl font-black text-black"
                                textClassName="text-[1.05rem] font-medium text-gray-600 leading-8 break-words"
                                pairLabelClassName="text-black font-black"
                                pairValueClassName="text-[1.05rem] font-medium text-gray-600 leading-8 break-words"
                                valueStackClassName="space-y-3"
                            />

                            {/* Actions */}
                            <div className="mt-8 md:mt-12 flex flex-wrap justify-center md:justify-start gap-4 pt-6 md:pt-8 border-t border-gray-100">
                                {item.link_url && (
                                    <a 
                                        href={item.link_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-[#0891b2] hover:text-cyan-700 transition-all"
                                    >
                                        {t('publications.readFullArticle')} <ExternalLink size={16} />
                                    </a>
                                )}
                                {item.file_url && (
                                    <a 
                                        href={item.file_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] bg-brand-gold text-white px-6 py-2 rounded-full hover:bg-[#b89a65] transition-all shadow-lg"
                                    >
                                        {t('publications.downloadPdf')} <Download size={16} />
                                    </a>
                                )}
                            </div>

                            {/* Divider for next item */}
                            {index !== publications.length - 1 && (
                                <div className="mt-24 w-1/3 mx-auto h-[1px] bg-gray-200" />
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
