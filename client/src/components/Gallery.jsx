import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { useTranslatedDataRows } from '../utils/useTranslatedDataRows';

const Gallery = () => {
    const [images, setImages] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const { language, t } = useI18n();
    const translatedImages = useTranslatedDataRows(images, ['caption', 'category'], language);
    const translatedCategories = useTranslatedDataRows(categories, ['name'], language);
    const noDataLabel = getNoDataLabel(language);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [imgRes, catRes] = await Promise.all([
                    api.get('/gallery'),
                    api.get('/gallery-categories')
                ]);
                setImages(Array.isArray(imgRes.data) ? imgRes.data : []);
                setCategories(Array.isArray(catRes.data) ? catRes.data : []);
            } catch (err) {
                console.error('Error fetching gallery data:', err);
                setImages([]);
                setCategories([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [language]);

    const usedCategories = translatedCategories.filter(cat => 
        translatedImages.some(img => img.category === cat.name)
    );

    const filteredImages = activeCategory === 'all' 
        ? translatedImages 
        : translatedImages.filter(img => img.category === activeCategory);

    if (loading) {
        return (
            <section id="gallery" className="py-16 md:py-24 bg-[#fcfaf7] min-h-[60vh] flex items-center justify-center">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('gallery.kicker')}</span>
                    <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-8 text-gray-900 tracking-tight">{t('common.loading')}</h2>
                </div>
            </section>
        );
    }

    if (images.length === 0) {
        return (
            <section id="gallery" className="py-16 md:py-24 bg-[#fcfaf7] min-h-[60vh] flex items-center justify-center">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('gallery.kicker')}</span>
                    <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-4 text-gray-900 tracking-tight">{t('gallery.titleMain')} <span className="text-brand-blue font-black">{t('gallery.titleAccent')}</span></h2>
                    <p className="text-gray-500 font-medium">{noDataLabel}</p>
                </div>
            </section>
        );
    }

    return (
        <section id="gallery" className="py-16 md:py-24 bg-[#fcfaf7]">
            <div className="max-w-7xl mx-auto px-6">
                <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('gallery.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-10 md:mb-16 text-gray-900 tracking-tight">{t('gallery.titleMain')} <span className="text-brand-blue font-black">{t('gallery.titleAccent')}</span></h2>
                
                {/* Category Filter Bar */}
                <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-10 md:mb-16">
                    <button 
                        onClick={() => setActiveCategory('all')}
                        className={`px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-sm md:text-base transition-all ${activeCategory === 'all' ? 'bg-brand-blue text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}
                    >
                        {t('common.all')}
                    </button>
                    {usedCategories.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.name)}
                            className={`px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-sm md:text-base transition-all ${activeCategory === cat.name ? 'bg-brand-blue text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}
                        >
                            {getLocalizedField(cat, 'name', language, cat.name)}
                        </button>
                    ))}
                </div>

                <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
                    {filteredImages.map((img) => {
                        const localizedCaption = getLocalizedField(img, 'caption', language, img.caption);
                        const localizedCategory = getLocalizedField(img, 'category', language, img.category);

                        return (
                        <motion.div
                            key={img.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="break-inside-avoid relative group cursor-pointer overflow-hidden rounded-[3rem] border-4 border-white shadow-2xl shadow-gray-200/50"
                            onClick={() => setSelectedImage(img)}
                        >
                            <img 
                                src={img.image_url} 
                                alt={localizedCaption}
                                className="w-full h-auto transition-transform duration-1000 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/90 via-brand-blue/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6 md:p-8">
                                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{localizedCategory}</span>
                                <p className="text-white font-bold text-xl md:text-2xl uppercase tracking-tight transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75 leading-tight">{localizedCaption}</p>
                            </div>
                        </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        <button className="absolute top-8 right-8 text-white p-2 hover:bg-white/10 rounded-full">
                            <X size={32} />
                        </button>
                        <motion.img 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            src={selectedImage.image_url} 
                            alt={getLocalizedField(selectedImage, 'caption', language, selectedImage.caption)} 
                            className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl"
                        />
                        <p className="absolute bottom-8 text-white text-xl">{getLocalizedField(selectedImage, 'caption', language, selectedImage.caption)}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default Gallery;
