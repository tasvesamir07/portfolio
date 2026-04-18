import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, ExternalLink, ArrowRight } from 'lucide-react';
import api from '../api';
import StructuredDetails from './StructuredDetails';
import { parseStructuredItems } from '../utils/structuredItems';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { useTranslatedDataRows } from '../utils/useTranslatedDataRows';

const Research = () => {
    const [research, setResearch] = useState([]);
    const [loading, setLoading] = useState(true);
    const { language, t } = useI18n();
    const translatedResearch = useTranslatedDataRows(research, ['title', 'status', 'date_text'], language);
    const noDataLabel = getNoDataLabel(language);

    useEffect(() => {
        const fetchResearch = async () => {
            setLoading(true);
            try {
                const res = await api.get('/research');
                setResearch(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Error fetching research:', err);
                setResearch([]);
            } finally {
                setLoading(false);
            }
        };
        fetchResearch();
    }, [language]);

    if (loading) return (
         <section id="research" className="py-16 md:py-24 bg-[#fcfaf7] min-h-[60vh] flex items-center justify-center">
            <div className="max-w-7xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('research.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('common.loading')}</h2>
            </div>
         </section>
    );

    if (research.length === 0) return (
         <section id="research" className="py-16 md:py-24 bg-[#fcfaf7] min-h-[60vh] flex items-center justify-center">
            <div className="max-w-7xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('research.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('research.emptyTitleMain')} <span className="text-brand-blue">{t('research.emptyTitleAccent')}</span> {t('research.emptyTitleSuffix')}</h2>
                <p className="text-gray-500 font-medium">{noDataLabel}</p>
            </div>
         </section>
    );

    return (
        <section id="research" className="py-16 md:py-24 bg-[#fcfaf7]">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('research.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-10 md:mb-16 text-gray-900 tracking-tight">{t('research.titleMain')} <span className="text-brand-blue font-black">{t('research.titleAccent')}</span></h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {translatedResearch.map((item, index) => {
                        // Merge both structured data and legacy description to prevent content being hidden
                        const structuredData = getLocalizedField(item, 'details_json', language, '');
                        const descriptionText = getLocalizedField(item, 'description', language, '');
                        const detailItems = [
                            ...parseStructuredItems(structuredData),
                            ...parseStructuredItems(descriptionText)
                        ];

                        const title = getLocalizedField(item, 'title', language, item.title);
                        const status = getLocalizedField(item, 'status', language, item.status);
                        const dateText = getLocalizedField(item, 'date_text', language, item.date_text);

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                                className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-gray-100 hover:shadow-2xl transition-all group flex flex-col md:flex-row shadow-xl shadow-gray-200/20"
                            >
                                <div className="w-full md:w-2/5 h-48 sm:h-64 md:h-full relative overflow-hidden bg-gray-50 flex-shrink-0">
                                    {item.image_url ? (
                                        <img 
                                            src={item.image_url} 
                                            alt={title} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                                            <Briefcase size={64} />
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 md:p-10 flex flex-col justify-center flex-1">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <span className="px-3 py-1 bg-brand-blue/5 text-brand-blue text-[10px] font-black uppercase tracking-widest rounded-full border border-brand-blue/10">
                                            {status || t('research.projectFallback')}
                                        </span>
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                            {dateText}
                                        </span>
                                    </div>
                                    <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 group-hover:text-brand-blue transition-colors uppercase leading-tight">
                                        {title}
                                    </h3>
                                    <StructuredDetails
                                        items={detailItems}
                                        className="space-y-4 mb-6"
                                        titleClassName="text-lg font-bold text-gray-900 leading-tight"
                                        textClassName="text-gray-600 leading-7 text-base break-words"
                                        pairLabelClassName="text-gray-800 font-semibold"
                                        pairValueClassName="text-gray-600 leading-7 text-base break-words"
                                    />
                                    <div className="mt-auto flex flex-wrap gap-4 items-center">
                                        {item.link && (
                                            <a 
                                                href={item.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-brand-blue font-bold hover:gap-3 transition-all uppercase tracking-widest text-[11px] border-b-2 border-brand-blue/20 pb-1"
                                            >
                                                {t('research.viewProject')} <ArrowRight size={14} />
                                            </a>
                                        )}
                                        {item.file_url && (
                                            <a 
                                                href={item.file_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-brand-gold font-bold hover:gap-3 transition-all uppercase tracking-widest text-[11px] border-b-2 border-brand-gold/20 pb-1"
                                            >
                                                {t('research.fullPaper')} <ArrowRight size={14} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Research;
