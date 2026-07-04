import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { RenderInlineHtml } from '../utils/htmlRenderer';
import PublicationsSkeleton from '../pages/skeletons/PublicationsSkeleton';

const Membership = () => {
    const prefersReduced = useReducedMotion();
    const { language, t } = useI18n();
    const noDataLabel = getNoDataLabel(language);

    const { data: memberships = [], isLoading } = useQuery({
        queryKey: ['memberships', language],
        queryFn: async () => {
            const res = await api.get('/memberships');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    if (isLoading) return <PublicationsSkeleton />;

    const societies = memberships.filter((m: any) => m.membership_type === 'society');
    const editorialBoards = memberships.filter((m: any) => m.membership_type === 'editorial_board');

    const isEmpty = societies.length === 0 && editorialBoards.length === 0;

    if (isEmpty) return (
        <section id="membership" className="py-16 md:py-24 bg-white min-h-[60vh] flex items-center justify-center">
            <div className="max-w-5xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('membership.kicker')}</span>
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('membership.emptyTitleMain')} <span className="text-brand-blue">{t('membership.emptyTitleAccent')}</span></h1>
                <p className="text-gray-500 font-medium">{noDataLabel}</p>
            </div>
        </section>
    );

    const renderList = (items: any[], titleKey: string, showPosition: boolean) => (
        <div className="mb-16 last:mb-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t(titleKey)}</h2>
            <div className="w-16 h-[1px] bg-brand-gold mb-8" />
            <div className="space-y-4">
                {items.map((item: any, i: number) => {
                    const name = getLocalizedField(item, 'name', language, item.name);
                    const position = getLocalizedField(item, 'position', language, item.position);

                    return (
                        <motion.div
                            key={item.id}
                            {...(!prefersReduced ? {
                                initial: { opacity: 0, x: -20 },
                                whileInView: { opacity: 1, x: 0 },
                                viewport: { once: true },
                                transition: { duration: 0.3, delay: i * 0.05 }
                            } : {})}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0" />
                                <div className="min-w-0">
                                    <span className="font-semibold text-gray-900">
                                        <RenderInlineHtml html={name} />
                                    </span>
                                    {showPosition && position && (
                                        <span className="text-gray-500 ml-2">
                                            – <RenderInlineHtml html={position} />
                                        </span>
                                    )}
                                </div>
                            </div>
                            {item.url && (
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 ml-4 text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                    <ExternalLink size={18} />
                                </a>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <section id="membership" className="py-16 md:py-24 bg-white">
            <div className="max-w-4xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-xs sm:text-sm">{t('membership.kicker')}</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-center mb-6 text-[#8c2626] tracking-tight">
                    {language === 'en' ? (
                        <>Professional <span className="text-brand-blue font-sans font-black">Memberships</span></>
                    ) : (
                        <>{t('membership.titleMain')} <span className="text-brand-blue font-sans font-black">{t('membership.titleAccent')}</span></>
                    )}
                </h1>
                <div className="w-32 h-[1px] bg-gray-200 mx-auto mb-16" />

                {societies.length > 0 && renderList(societies, 'membership.societyMembers', false)}
                {editorialBoards.length > 0 && renderList(editorialBoards, 'membership.editorialBoard', true)}
            </div>
        </section>
    );
};

export default React.memo(Membership);
