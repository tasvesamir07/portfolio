import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Calendar } from 'lucide-react';
import api from '../api';
import StructuredDetails from './StructuredDetails';
import { parseStructuredItems } from '../utils/structuredItems';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedFirstField } from '../i18n/localize';
import { useTranslatedDataRows } from '../utils/useTranslatedDataRows';

const Academics = () => {
    const [academics, setAcademics] = useState([]);
    const { language, t } = useI18n();
    const translatedAcademics = useTranslatedDataRows(academics, ['degree', 'institution', 'location'], language);

    useEffect(() => {
        const fetchAcademics = async () => {
            try {
                const res = await api.get('/academics');
                setAcademics(res.data);
            } catch (err) {
                console.error('Error fetching academics:', err);
            }
        };
        fetchAcademics();
    }, [language]);

    const normalizeText = (value = '') =>
        value
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

    return (
        <section id="academics" className="py-16 md:py-24 bg-[#fcfaf7]">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('academics.kicker')}</span>
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-center mb-10 md:mb-16 text-gray-900 tracking-tight">{t('academics.titleMain')} {t('academics.titleAccent') ? <span className="text-brand-gold font-black">{t('academics.titleAccent')}</span> : null}</h2>
                <div className="flex flex-col gap-10">
                    {translatedAcademics.map((item, index) => (
                        (() => {
                            const hasSavedStructuredJson =
                                typeof item.details_json === 'string' && item.details_json.trim().startsWith('[');
                            const parsedItems = parseStructuredItems(getLocalizedFirstField(item, ['details_json'], language, '') || item.details_json || '');
                            const degree = getLocalizedField(item, 'degree', language, item.degree);
                            const institution = getLocalizedField(item, 'institution', language, item.institution);
                            const primaryTitle = degree || institution;
                            const institutionText = institution && institution !== degree ? institution : '';
                            const timelineText = [item.start_year, item.end_year].filter(Boolean).join(' - ');
                            const fallbackItems = [];
                            const parsedLabels = new Set(
                                parsedItems
                                    .filter((detailItem) => detailItem.type === 'pair')
                                    .map((detailItem) => normalizeText(detailItem.title))
                            );
                            const hasMatchingInstitutionText = parsedItems.some(
                                (detailItem) => detailItem.type === 'text' && normalizeText(detailItem.text) === normalizeText(institutionText)
                            );

                            if (!hasSavedStructuredJson && item.end_year && !parsedLabels.has('passing year')) {
                                fallbackItems.push({
                                    id: `fallback-passing-${item.id}`,
                                    type: 'pair',
                                    title: t('academics.passingYear'),
                                    values: [item.end_year],
                                    text: ''
                                });
                            }

                            if (!hasSavedStructuredJson && institutionText && !hasMatchingInstitutionText && !parsedItems.length) {
                                fallbackItems.push({
                                    id: `fallback-institution-${item.id}`,
                                    type: 'text',
                                    title: '',
                                    values: [''],
                                    text: institutionText
                                });
                            }

                            const detailItems = [...parsedItems, ...fallbackItems].filter((detailItem) => {
                                if (detailItem.type === 'title') {
                                    return normalizeText(detailItem.title) !== normalizeText(primaryTitle);
                                }

                                if (detailItem.type === 'text') {
                                    return normalizeText(detailItem.text) !== normalizeText(institutionText);
                                }

                                return true;
                            });
                            const showInstitutionSubtitle = Boolean(institutionText);

                            return (
                        <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-white p-6 md:p-9 rounded-2xl md:rounded-3xl flex flex-col md:flex-row items-start gap-5 md:gap-7 group hover:border-brand-blue/30 border border-gray-100 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex-shrink-0 w-16 h-16 sm:w-[74px] sm:h-[74px] bg-brand-blue/5 rounded-2xl flex items-center justify-center transition-all mt-1">
                                {item.logo_url ? (
                                    <img src={item.logo_url} alt={institution} className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <GraduationCap className="w-8 h-8 sm:w-9 sm:h-9 text-brand-blue" strokeWidth={2.3} />
                                )}
                            </div>
                            <div className="flex-1 w-full text-left">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-8 mb-5">
                                    <div className="min-w-0">
                                        <h3 className="text-[2rem] sm:text-[2.35rem] md:text-[2.7rem] font-medium tracking-tight text-gray-700 leading-[1.12] break-words">
                                            {primaryTitle}
                                        </h3>
                                        {showInstitutionSubtitle && (
                                            <p className="mt-2 text-lg md:text-[1.15rem] leading-8 text-gray-500 break-words">
                                                {institutionText}
                                            </p>
                                        )}
                                    </div>
                                    {timelineText && (
                                        <div className="text-left md:text-right flex flex-col gap-1.5 md:min-w-[220px] pt-1">
                                            <p className="text-[12px] sm:text-[13px] font-semibold text-gray-500 flex items-center justify-start md:justify-end gap-1.5 whitespace-nowrap">
                                                <Calendar size={14} className="text-gray-400" /> {timelineText}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {detailItems.length > 0 && (
                                    <StructuredDetails
                                        items={detailItems}
                                        className="space-y-4 text-left mt-1"
                                        titleClassName="text-xl md:text-2xl font-medium text-gray-700 leading-tight"
                                        textClassName="text-gray-600 text-lg md:text-[1.12rem] leading-[1.75] break-words [&_a]:text-gray-600 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-sky-600"
                                        pairLabelClassName="text-gray-700 font-medium text-lg md:text-[1.08rem]"
                                        pairValueClassName="text-gray-600 text-lg md:text-[1.08rem] leading-[1.75] break-words [&_a]:text-gray-600 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-sky-600"
                                        valueStackClassName="space-y-2.5"
                                    />
                                )}
                            </div>
                        </motion.div>
                            );
                        })()
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Academics;
