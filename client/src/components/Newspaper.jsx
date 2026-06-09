import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper as NewspaperIcon, ExternalLink, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { getTransformedUrl, buildSrcSet } from '../utils/imageUrl';

const Newspaper = () => {
    const [brokenImages, setBrokenImages] = useState([]);
    const { language, t } = useI18n();
    const noDataLabel = getNoDataLabel(language);

    const { data: articles = [], isLoading } = useQuery({
        queryKey: ['newspapers', language],
        queryFn: async () => {
            const res = await api.get('/newspapers');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    // Localized labels for Newspaper
    const kickerLabel = language === 'bn' ? 'মিডিয়া কভারেজ' : language === 'ko' ? '미디어 보도' : 'Media Coverage';
    const titleMainLabel = language === 'bn' ? 'খবর ও ' : language === 'ko' ? '뉴스 및 ' : 'News & ';
    const titleAccentLabel = language === 'bn' ? 'সংবাদপত্র' : language === 'ko' ? '언론 보도' : 'Press';
    const readMoreLabel = language === 'bn' ? 'আরও পড়ুন' : language === 'ko' ? '자세히 보기' : 'Read Article';
    const emptyLabel = language === 'bn' ? 'কোনো সংবাদ নিবন্ধ পাওয়া যায়নি।' : language === 'ko' ? '보도된 뉴스 기사가 없습니다.' : 'No news articles found.';

    if (isLoading) return (
         <section id="newspaper" className="py-16 md:py-24 bg-[#fcfaf7] min-h-[60vh] flex items-center justify-center">
            <div className="max-w-7xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{kickerLabel}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('common.loading')}</h2>
            </div>
         </section>
    );

    if (articles.length === 0) return (
         <section id="newspaper" className="py-16 md:py-24 bg-[#fcfaf7] min-h-[60vh] flex items-center justify-center">
            <div className="max-w-7xl mx-auto px-6 text-center">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{kickerLabel}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{titleMainLabel}<span className="text-brand-blue">{titleAccentLabel}</span></h2>
                <p className="text-gray-500 font-medium">{emptyLabel}</p>
            </div>
         </section>
    );

    return (
        <section id="newspaper" className="py-16 md:py-24 bg-[#fcfaf7]">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{kickerLabel}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-10 md:mb-16 text-gray-900 tracking-tight">{titleMainLabel}<span className="text-brand-blue">{titleAccentLabel}</span></h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {articles.map((item, index) => {
                        const title = getLocalizedField(item, 'title', language, item.title);
                        const shortDescription = getLocalizedField(item, 'short_description', language, item.short_description);

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                whileHover={{ scale: 1.02, y: -6 }}
                                className="bg-white rounded-2xl overflow-hidden border border-gray-100 transition-colors duration-300 motion-card-hover flex flex-col shadow-sm"
                            >
                                <div className="w-full h-48 relative overflow-hidden bg-gray-50 flex-shrink-0 border-b border-gray-50">
                                    {item.image_url && !brokenImages.includes(item.id) ? (
                                        <img 
                                            src={getTransformedUrl(item.image_url, 480, 75)} 
                                            srcSet={buildSrcSet(item.image_url)}
                                            sizes="(max-width: 768px) 100vw, 480px"
                                            alt={title} 
                                            loading="lazy"
                                            decoding="async"
                                            width="480"
                                            height="320"
                                            className="w-full h-full object-cover" 
                                            style={{ maxWidth: '100%', height: 'auto' }}
                                            onError={() => setBrokenImages((prev) => [...prev, item.id])}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#ceb079]/40 bg-[#ceb079]/5">
                                            <NewspaperIcon size={48} strokeWidth={1.5} />
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 flex-1 flex flex-col justify-between text-left">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 leading-tight mb-3 line-clamp-2">
                                            {item.link_url ? (
                                                <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-[#0b3b75] transition-colors">
                                                    {title}
                                                </a>
                                            ) : (
                                                title
                                            )}
                                        </h3>
                                        <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
                                            {shortDescription}
                                        </p>
                                    </div>
                                    {item.link_url && (
                                        <div className="pt-4 border-t border-gray-50">
                                            <a 
                                                href={item.link_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ceb079] hover:text-[#0b3b75] transition-colors"
                                            >
                                                {readMoreLabel} <ArrowRight size={14} />
                                            </a>
                                        </div>
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

export default Newspaper;
