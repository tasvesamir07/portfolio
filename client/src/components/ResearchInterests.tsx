/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, GraduationCap, Briefcase, Globe } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import StructuredDetails from './StructuredDetails';
import { parseStructuredItems } from '../utils/structuredItems';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedFirstField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { RenderInlineHtml } from '../utils/htmlRenderer';

const iconMap: Record<string, any> = {
    FileText,
    GraduationCap,
    Briefcase,
    Globe
};

const ResearchInterests = () => {
    const prefersReduced = useReducedMotion();
    const { language, t } = useI18n();
    const noDataLabel = getNoDataLabel(language);

    const { data: interests = [], isLoading } = useQuery({
        queryKey: ['research-interests', language],
        queryFn: async () => {
            const res = await api.get('/research-interests');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

     if (isLoading) {
        return (
            <section id="research-interests" className="py-24 bg-[#fcfaf7] min-h-[60vh] flex items-center justify-center">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center">{t('researchInterests.kicker')}</span>
                    <h1 className="text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('common.loading')}</h1>
                </div>
            </section>
        );
    }

    if (interests.length === 0) {
        return (
            <section id="research-interests" className="py-24 bg-[#fcfaf7] min-h-[60vh] flex items-center justify-center">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center">{t('researchInterests.kicker')}</span>
                    <h1 className="text-5xl md:text-7xl font-bold text-center mb-4 text-gray-900 tracking-tight">{t('researchInterests.titleMain')} <span className="text-brand-blue">{t('researchInterests.titleAccent')}</span></h1>
                    <p className="text-gray-500 font-medium">{noDataLabel}</p>
                </div>
            </section>
        );
    }

    return (
        <section id="research-interests" className="py-24 bg-[#fcfaf7]">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center">{t('researchInterests.kicker')}</span>
                <h1 className="text-5xl md:text-7xl font-bold text-center mb-16 text-gray-900 tracking-tight">{t('researchInterests.titleMain')} <span className="text-brand-blue">{t('researchInterests.titleAccent')}</span></h1>
                <div className="grid grid-cols-1 gap-8">
                    {interests.map((item, index) => {
                        const detailItems = parseStructuredItems(getLocalizedFirstField(item, ['details_json', 'details'], language, ''));
                        const interest = getLocalizedField(item, 'interest', language, item.interest);

                        return (
                            <motion.div 
                                key={item.id}
                                {...(!prefersReduced ? {
                                    initial: { opacity: 0, scale: 0.9 },
                                    whileInView: { opacity: 1, scale: 1 },
                                    viewport: { once: true },
                                    transition: { duration: 0.5, delay: index * 0.1 },
                                    whileHover: { scale: 1.02, y: -6 }
                                } : {})}
                                className="bg-white p-10 rounded-[3rem] border-2 border-gray-100 transition-colors duration-300 shadow-xl shadow-gray-200/20 group motion-card-hover"
                            >
                                <div className="w-16 h-16 bg-brand-blue/5 rounded-2xl flex items-center justify-center text-brand-blue mb-8 group-hover:bg-brand-blue group-hover:text-white transition-all shadow-lg shadow-brand-blue/10">
                                    {React.createElement(iconMap[item.icon_name] || FileText, { size: 32 })}
                                </div>
                                <h3 className="text-[1.75rem] md:text-[1.95rem] font-bold text-gray-900 mb-4 group-hover:text-brand-blue transition-colors tracking-tight leading-[1.18] break-words">
                                    <RenderInlineHtml html={interest} />
                                </h3>
                                <StructuredDetails
                                    items={detailItems}
                                    className="space-y-4 research-interest-content"
                                    titleClassName="text-xl font-bold text-gray-900  leading-tight"
                                    textClassName="text-gray-600  leading-8 text-[1.05rem] break-words"
                                    pairLabelClassName="text-gray-800  font-semibold"
                                    pairValueClassName="text-gray-600  leading-8 text-[1.05rem] break-words"
                                />
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default React.memo(ResearchInterests);
