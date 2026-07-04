import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Calendar } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { usePublicPageData } from '../hooks/useSiteName';
import { getNoDataLabel } from '../utils/publicSectionState';
import { RenderInlineHtml } from '../utils/htmlRenderer';
import PublicationsSkeleton from '../pages/skeletons/PublicationsSkeleton';

const isFieldEmpty = (html: any) => {
    if (!html) return true;
    const clean = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
    return clean === '' || clean.toLowerCase() === 'n/a';
};

const Conferences = () => {
    const prefersReduced = useReducedMotion();
    const { language, t } = useI18n();
    const noDataLabel = getNoDataLabel(language);
    const { data: publicData } = usePublicPageData();

    const { data: conferences = [], isLoading } = useQuery({
        queryKey: ['conferences', language],
        queryFn: async () => {
            const res = await api.get('/conferences');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    if (isLoading) return <PublicationsSkeleton />;

    if (conferences.length === 0) return (
         <section id="conferences" className="py-16 md:py-24 bg-white min-h-[60vh] flex items-center justify-center">
            <div className="max-w-5xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('conferences.kicker')}</span>
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('conferences.emptyTitleMain')} <span className="text-brand-blue">{t('conferences.emptyTitleAccent')}</span> {t('conferences.emptyTitleSuffix')}</h1>
                <p className="text-gray-500 font-medium">{noDataLabel}</p>
            </div>
         </section>
    );

    return (
        <section id="conferences" className="py-16 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-xs sm:text-sm">{t('conferences.kicker')}</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-center mb-6 text-[#8c2626] tracking-tight animate-none">
                    {language === 'en' ? (
                        <>Conference <span className="text-brand-blue font-sans font-black">Proceedings</span></>
                    ) : (
                        <>{t('conferences.titleMain')} <span className="text-brand-blue font-sans font-black">{t('conferences.titleAccent')}</span></>
                    )}
                </h1>
                <div className="w-32 h-[1px] bg-gray-200 mx-auto mb-16" />
                
                <div className="grid grid-cols-1 gap-6 md:gap-9 max-w-7xl mx-auto w-full">
                    {conferences.map((item: any) => {
                        const title = getLocalizedField(item, 'title', language, item.title);
                        const authors = getLocalizedField(item, 'authors', language, item.authors);
                        const mainAuthor = getLocalizedField(item, 'main_author', language, item.main_author);
                        const conferenceDate = getLocalizedField(item, 'conference_date', language, item.conference_date);
                        const description = getLocalizedField(item, 'description', language, item.description);

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
                                    <div className="flex flex-col gap-4 mb-2">
                                        <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
                                            <RenderInlineHtml html={title} />
                                        </h3>

                                        <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                                            {(!isFieldEmpty(mainAuthor) || !isFieldEmpty(authors)) && (
                                                <p className="leading-relaxed">
                                                    <span className="font-bold text-gray-900">{t('conferences.authors') || 'Authors'}:</span>{' '}
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
                                            {!isFieldEmpty(conferenceDate) && (
                                                <p className="leading-relaxed">
                                                    <Calendar size={14} className="inline mr-1 text-[#ceb079]" />
                                                    <span className="font-bold text-gray-900">{t('conferences.date') || 'Date'}:</span>{' '}
                                                    <span className="font-medium text-gray-700"><RenderInlineHtml html={conferenceDate} /></span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {!isFieldEmpty(description) && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                <RenderInlineHtml html={description} />
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {item.link_url && (
                                    <div className="mt-6 pt-4 border-t border-gray-100 flex flex-row gap-3 w-full justify-end items-center">
                                        <a 
                                            href={item.link_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2d8da8] hover:text-[#1d6b82] transition-colors"
                                        >
                                            {t('conferences.viewProceedings') || 'View Proceedings'} <ExternalLink size={14} />
                                        </a>
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

export default React.memo(Conferences);
