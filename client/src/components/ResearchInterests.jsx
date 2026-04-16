import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, GraduationCap, Briefcase, Globe } from 'lucide-react';
import api from '../api';
import StructuredDetails from './StructuredDetails';
import { parseStructuredItems } from '../utils/structuredItems';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedFirstField } from '../i18n/localize';

const iconMap = {
    FileText,
    GraduationCap,
    Briefcase,
    Globe
};

const ResearchInterests = () => {
    const [interests, setInterests] = useState([]);
    const { language, t } = useI18n();

    useEffect(() => {
        const fetchInterests = async () => {
            try {
                const res = await api.get('/research-interests');
                setInterests(res.data);
            } catch (err) {
                console.error('Error fetching research interests:', err);
            }
        };
        fetchInterests();
    }, [language]);

    return (
        <section id="research-interests" className="py-24 bg-[#fcfaf7]">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center">{t('researchInterests.kicker')}</span>
                <h2 className="text-5xl md:text-7xl font-bold text-center mb-16 text-gray-900 tracking-tight">{t('researchInterests.titleMain')} <span className="text-brand-blue">{t('researchInterests.titleAccent')}</span></h2>
                <div className="grid grid-cols-1 gap-8">
                    {interests.map((item, index) => {
                        const detailItems = parseStructuredItems(getLocalizedFirstField(item, ['details_json', 'details'], language, ''));
                        const interest = getLocalizedField(item, 'interest', language, item.interest);

                        return (
                            <motion.div 
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                className="bg-white p-10 rounded-[3rem] border-2 border-gray-100 hover:border-brand-blue/80/50 transition-all shadow-xl shadow-gray-200/20 group"
                            >
                                <div className="w-16 h-16 bg-brand-blue/5 rounded-2xl flex items-center justify-center text-brand-blue mb-8 group-hover:bg-brand-blue group-hover:text-white transition-all shadow-lg shadow-brand-blue/10">
                                    {React.createElement(iconMap[item.icon_name] || FileText, { size: 32 })}
                                </div>
                                <h3 className="text-[1.75rem] md:text-[1.95rem] font-bold text-gray-900 mb-4 group-hover:text-brand-blue transition-colors tracking-tight leading-[1.18] break-words">
                                    {interest}
                                </h3>
                                <StructuredDetails
                                    items={detailItems}
                                    className="space-y-4 research-interest-content"
                                    titleClassName="text-xl font-bold text-gray-900 leading-tight"
                                    textClassName="text-gray-600 leading-8 text-[1.05rem] break-words"
                                    pairLabelClassName="text-gray-800 font-semibold"
                                    pairValueClassName="text-gray-600 leading-8 text-[1.05rem] break-words"
                                />
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ResearchInterests;
