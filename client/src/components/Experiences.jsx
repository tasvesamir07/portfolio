import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Calendar, MapPin, GraduationCap, Award, CheckCircle2 } from 'lucide-react';
import api from '../api';
import StructuredDetails from './StructuredDetails';
import { parseStructuredItems } from '../utils/structuredItems';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedFirstField } from '../i18n/localize';

const Experiences = () => {
    const [experiences, setExperiences] = useState([]);
    const [trainings, setTrainings] = useState([]);
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const { language, t } = useI18n();

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [expRes, trainRes, skillsRes] = await Promise.all([
                    api.get('/experiences'),
                    api.get('/trainings'),
                    api.get('/skills')
                ]);
                setExperiences(expRes.data);
                setTrainings(trainRes.data);
                setSkills(skillsRes.data);
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [language]);

    if (loading) return <div className="py-24 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">{t('experiences.loading')}</div>;

    return (
        <section id="experiences" className="py-16 md:py-24 bg-[#fcfaf7]">
            <div className="max-w-7xl mx-auto px-6">
                {/* Work Experience Section */}
                <span className="text-brand-blue font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('experiences.workKicker')}</span>
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-center mb-10 md:mb-16 text-gray-900 tracking-tight">{t('experiences.workTitleMain')} <span className="text-brand-gold font-black">{t('experiences.workTitleAccent')}</span></h2>
                
                <div className="flex flex-col gap-10 mb-24">
                    {experiences.length > 0 ? experiences.map((item, index) => (
                        (() => {
                            // Combine both structured details and legacy description to ensure nothing is hidden
                            const structuredPart = getLocalizedField(item, 'details_json', language, '');
                            const descriptionPart = getLocalizedField(item, 'description', language, '');
                            const detailItems = [
                                ...parseStructuredItems(structuredPart),
                                ...parseStructuredItems(descriptionPart)
                            ];

                            const position = getLocalizedField(item, 'position', language, item.position);
                            const company = getLocalizedField(item, 'company', language, item.company);
                            const locationLabel = getLocalizedField(item, 'location', language, item.location);

                            return (
                        <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl flex flex-col md:flex-row items-center md:items-start gap-6 group hover:border-brand-blue/30 border border-gray-100 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 rounded-2xl flex items-center justify-center transition-all">
                                {item.logo_url ? (
                                    <img src={item.logo_url} alt={company} className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-brand-gold" strokeWidth={2.5} />
                                )}
                            </div>
                            <div className="flex-1 w-full text-center md:text-left">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-4 mb-3">
                                    <div className="text-center md:text-left">
                                        <h3 className="text-xl md:text-2xl font-bold text-[#0b3b75] tracking-tight uppercase leading-tight mb-1">{position}</h3>
                                        <p className="text-brand-gold font-bold uppercase tracking-wide text-xs">{company}</p>
                                    </div>
                                    <div className="text-center md:text-right flex flex-col gap-1.5 md:min-w-[140px] pt-1">
                                        <p className="text-[12px] font-bold text-gray-500 flex items-center justify-center md:justify-end gap-1.5">
                                            <Calendar size={14} className="text-gray-400" /> {item.start_date} - {item.end_date || t('common.present')}
                                        </p>
                                        {locationLabel && (
                                            <p className="text-[11px] font-bold text-gray-400 flex items-center justify-center md:justify-end gap-1.5 uppercase tracking-widest leading-tight">
                                                <MapPin size={12} className="text-gray-300" /> {locationLabel}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {detailItems.length > 0 && (
                                    <StructuredDetails
                                        items={detailItems}
                                        className="space-y-4 text-left"
                                        titleClassName="text-lg md:text-xl font-bold text-[#0b3b75] leading-tight"
                                        textClassName="text-gray-700 text-sm md:text-base leading-8 break-words"
                                        pairLabelClassName="text-gray-800 font-semibold whitespace-nowrap"
                                        pairValueClassName="text-gray-700 text-sm md:text-base leading-8 break-words"
                                        valueStackClassName="space-y-2"
                                    />
                                )}
                            </div>
                        </motion.div>
                            );
                        })()
                    )) : (
                        <p className="text-center text-gray-400 italic py-10">{t('experiences.noWorkRecords')}</p>
                    )}
                </div>

                {/* Training / Workshops Section */}
                {trainings.length > 0 && (
                    <>
                        <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('experiences.trainingKicker')}</span>
                        <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-center mb-10 md:mb-12 text-gray-900 tracking-tight">{t('experiences.trainingTitleMain')} <span className="text-brand-blue">{t('experiences.trainingTitleAccent')}</span></h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
                            {trainings.map((item, index) => (
                                (() => {
                                    const detailItems = parseStructuredItems(getLocalizedFirstField(item, ['details_json'], language, ''));
                                    const title = getLocalizedField(item, 'title', language, item.title);
                                    const topic = getLocalizedField(item, 'topic', language, item.topic);
                                    const instructor = getLocalizedField(item, 'instructor', language, item.instructor);
                                    const dateText = getLocalizedField(item, 'date_text', language, item.date_text);

                                    return (
                                <motion.div 
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: index * 0.05 }}
                                    className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 hover:border-brand-blue/30 transition-all shadow-sm hover:shadow-md group flex flex-col sm:flex-row gap-5 items-center sm:items-start"
                                >
                                    <div className="p-4 bg-brand-blue/5 text-brand-blue rounded-2xl group-hover:bg-brand-blue group-hover:text-white transition-colors">
                                        <Award size={24} />
                                    </div>
                                    <div className="text-center sm:text-left w-full">
                                        <h3 className="text-lg font-bold text-[#0b3b75] mb-1 uppercase tracking-tight leading-tight">{title}</h3>
                                        <p className="text-brand-gold font-semibold text-sm mb-3 uppercase tracking-wide">{topic}</p>
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} className="text-gray-400" /> {dateText}</span>
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5"><GraduationCap size={12} className="text-gray-400" /> {instructor}</span>
                                        </div>
                                        {detailItems.length > 0 && (
                                            <StructuredDetails
                                                items={detailItems}
                                                className="space-y-3 text-left mt-4"
                                                titleClassName="text-base md:text-lg font-bold text-[#0b3b75] leading-tight"
                                                textClassName="text-gray-700 text-sm md:text-base leading-7 break-words"
                                                pairLabelClassName="text-gray-800 font-semibold whitespace-nowrap"
                                                pairValueClassName="text-gray-700 text-sm md:text-base leading-7 break-words"
                                                valueStackClassName="space-y-2"
                                            />
                                        )}
                                    </div>
                                </motion.div>
                                    );
                                })()
                            ))}
                        </div>
                    </>
                )}

                {/* Skills Section */}
                {skills.length > 0 && (
                    <>
                        <span className="text-brand-blue font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('experiences.skillsKicker')}</span>
                        <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-center mb-10 md:mb-12 text-gray-900 tracking-tight">{t('experiences.skillsTitleMain')} <span className="text-brand-gold font-black">{t('experiences.skillsTitleAccent')}</span></h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {skills.map((item, index) => (
                                (() => {
                                    const localizedItemsText = getLocalizedField(item, 'items', language, item.items || '');
                                    const detailItems = parseStructuredItems(
                                        getLocalizedFirstField(item, ['details_json'], language, '')
                                        || localizedItemsText
                                            .split(',')
                                            .map((value) => value.trim())
                                            .filter(Boolean)
                                            .join('\n')
                                    );
                                    const category = getLocalizedField(item, 'category', language, item.category);

                                    return (
                                <motion.div 
                                    key={item.id}
                                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl text-gray-900 border border-gray-100 shadow-sm transition-all hover:shadow-md"
                                >
                                    <h3 className="text-lg font-black uppercase tracking-[0.15em] text-[#0b3b75] mb-5 border-b border-gray-100 pb-3 text-center md:text-left">{category}</h3>
                                    {detailItems.length > 0 ? (
                                        <StructuredDetails
                                            items={detailItems}
                                            className="space-y-3 text-left"
                                            titleClassName="text-base md:text-lg font-bold text-[#0b3b75] leading-tight"
                                            textClassName="text-gray-700 text-sm md:text-base leading-7 break-words flex items-start gap-2"
                                            pairLabelClassName="text-gray-800 font-semibold whitespace-nowrap"
                                            pairValueClassName="text-gray-700 text-sm md:text-base leading-7 break-words"
                                            valueStackClassName="space-y-2"
                                        />
                                    ) : (
                                        <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
                                            {localizedItemsText.split(',').map((skill, si) => (
                                                <span key={si} className="bg-[#fcfaf7] border border-gray-200 hover:border-[#ceb079] px-4 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all flex items-center gap-2 text-gray-700">
                                                    <CheckCircle2 size={14} className="text-[#ceb079]" /> {skill.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                                    );
                                })()
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default Experiences;
