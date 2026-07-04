import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Calendar } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { RenderInlineHtml } from '../utils/htmlRenderer';
import PublicationsSkeleton from '../pages/skeletons/PublicationsSkeleton';

const Projects = () => {
    const prefersReduced = useReducedMotion();
    const { language, t } = useI18n();
    const noDataLabel = getNoDataLabel(language);

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects', language],
        queryFn: async () => {
            const res = await api.get('/projects');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    if (isLoading) return <PublicationsSkeleton />;

    if (projects.length === 0) return (
        <section id="projects" className="py-16 md:py-24 bg-white min-h-[60vh] flex items-center justify-center">
            <div className="max-w-5xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('projects.kicker')}</span>
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('projects.emptyTitleMain')} <span className="text-brand-blue">{t('projects.emptyTitleAccent')}</span></h1>
                <p className="text-gray-500 font-medium">{noDataLabel}</p>
            </div>
        </section>
    );

    return (
        <section id="projects" className="py-16 md:py-24 bg-white">
            <div className="max-w-5xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-xs sm:text-sm">{t('projects.kicker')}</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-center mb-6 text-[#8c2626] tracking-tight">
                    {language === 'en' ? (
                        <>Research <span className="text-brand-blue font-sans font-black">Projects</span></>
                    ) : (
                        <>{t('projects.titleMain')} <span className="text-brand-blue font-sans font-black">{t('projects.titleAccent')}</span></>
                    )}
                </h1>
                <div className="w-32 h-[1px] bg-gray-200 mx-auto mb-16" />

                <div className="grid grid-cols-1 gap-5">
                    {projects.map((item: any, i: number) => {
                        const title = getLocalizedField(item, 'title', language, item.title);
                        const fundingOrg = getLocalizedField(item, 'funding_organization', language, item.funding_organization);

                        return (
                            <motion.div
                                key={item.id}
                                {...(!prefersReduced ? {
                                    initial: { opacity: 0, y: 20 },
                                    whileInView: { opacity: 1, y: 0 },
                                    viewport: { once: true },
                                    transition: { duration: 0.4, delay: i * 0.05 }
                                } : {})}
                                className="p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all"
                            >
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                                    <RenderInlineHtml html={title} />
                                </h3>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                                    {fundingOrg && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Building2 size={15} className="text-brand-gold" />
                                            <span className="font-medium text-gray-700">{t('projects.fundingOrganization')}:</span>{' '}
                                            <RenderInlineHtml html={fundingOrg} />
                                        </span>
                                    )}
                                    {item.duration && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Calendar size={15} className="text-brand-gold" />
                                            <span className="font-medium text-gray-700">{t('projects.duration')}:</span>{' '}
                                            {item.duration}
                                        </span>
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

export default React.memo(Projects);
