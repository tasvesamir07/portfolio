import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, GraduationCap, FlaskConical } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { RenderInlineHtml } from '../utils/htmlRenderer';
import PublicationsSkeleton from '../pages/skeletons/PublicationsSkeleton';

const Team = () => {
    const prefersReduced = useReducedMotion();
    const { language, t } = useI18n();
    const noDataLabel = getNoDataLabel(language);

    const { data: members = [], isLoading } = useQuery({
        queryKey: ['team-members', language],
        queryFn: async () => {
            const res = await api.get('/team-members');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    if (isLoading) return <PublicationsSkeleton />;

    if (members.length === 0) return (
        <section id="team" className="py-16 md:py-24 bg-white min-h-[60vh] flex items-center justify-center">
            <div className="max-w-5xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('team.kicker')}</span>
                <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('team.emptyTitleMain')} <span className="text-brand-blue">{t('team.emptyTitleAccent')}</span></h1>
                <p className="text-gray-500 font-medium">{noDataLabel}</p>
            </div>
        </section>
    );

    const researchers = members.filter((m: any) => m.member_type === 'researcher');
    const students = members.filter((m: any) => m.member_type === 'student');

    const renderSection = (sectionMembers: any[], titleKey: string) => {
        if (sectionMembers.length === 0) return null;
        return (
            <div className="mb-16 last:mb-0">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
                    {t(titleKey)}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {sectionMembers.map((item: any) => {
                        const name = getLocalizedField(item, 'name', language, item.name);
                        const researchArea = getLocalizedField(item, 'research_area', language, item.research_area);
                        const academicLevel = getLocalizedField(item, 'academic_level', language, item.academic_level);

                        return (
                            <motion.div
                                key={item.id}
                                {...(!prefersReduced ? {
                                    initial: { opacity: 0, y: 30 },
                                    whileInView: { opacity: 1, y: 0 },
                                    viewport: { once: true },
                                    whileHover: { scale: 1.02, y: -6 },
                                    transition: { duration: 0.5 }
                                } : {})}
                                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-center"
                            >
                                {item.photo_url ? (
                                    <img
                                        src={item.photo_url}
                                        alt={name}
                                        className="w-28 h-28 rounded-full object-cover mx-auto mb-4 border-2 border-gray-100"
                                    />
                                ) : (
                                    <div className="w-28 h-28 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                                        <span className="text-3xl font-bold text-gray-400">{name?.charAt(0) || '?'}</span>
                                    </div>
                                )}
                                <h3 className="text-lg font-bold text-gray-900 mb-1"><RenderInlineHtml html={name} /></h3>
                                {academicLevel && (
                                    <p className="text-sm text-gray-500 mb-3 flex items-center justify-center gap-1">
                                        <GraduationCap size={14} /> <RenderInlineHtml html={academicLevel} />
                                    </p>
                                )}
                                {researchArea && (
                                    <p className="text-sm text-gray-600 mb-3 flex items-center justify-center gap-1">
                                        <FlaskConical size={14} className="text-brand-gold" /> <RenderInlineHtml html={researchArea} />
                                    </p>
                                )}
                                <div className="flex justify-center gap-3 text-xs">
                                    {item.email && (
                                        <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors">
                                            <Mail size={14} /> {item.email}
                                        </a>
                                    )}
                                    {item.phone && (
                                        <span className="inline-flex items-center gap-1 text-gray-500">
                                            <Phone size={14} /> {item.phone}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <section id="team" className="py-16 md:py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-xs sm:text-sm">{t('team.kicker')}</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-center mb-6 text-[#8c2626] tracking-tight">
                    {language === 'en' ? (
                        <>Our <span className="text-brand-blue font-sans font-black">Team</span></>
                    ) : (
                        <>{t('team.titleMain')} <span className="text-brand-blue font-sans font-black">{t('team.titleAccent')}</span></>
                    )}
                </h1>
                <div className="w-32 h-[1px] bg-gray-200 mx-auto mb-16" />

                {renderSection(researchers, 'team.researchers')}
                {renderSection(students, 'team.students')}
            </div>
        </section>
    );
};

export default React.memo(Team);
