import React, { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { useTranslatedDataRows } from '../utils/useTranslatedDataRows';

const getGalleryCardLayout = (index) => {
    const layouts = [
        'md:col-span-2 md:row-span-2',
        'md:row-span-2',
        '',
        '',
        'lg:row-span-2',
        ''
    ];

    return layouts[index % layouts.length];
};

const Gallery = () => {
    const [images, setImages] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { language, t } = useI18n();
    const translatedImages = useTranslatedDataRows(images, ['caption', 'category'], language);
    const translatedCategories = useTranslatedDataRows(categories, ['name'], language);
    const noDataLabel = getNoDataLabel(language);
    const deferredActiveCategory = useDeferredValue(activeCategory);

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

    const usedCategories = useMemo(
        () => translatedCategories.filter((cat) => translatedImages.some((img) => img.category === cat.name)),
        [translatedCategories, translatedImages]
    );

    const filteredImages = useMemo(
        () => (deferredActiveCategory === 'all'
            ? translatedImages
            : translatedImages.filter((img) => img.category === deferredActiveCategory)),
        [deferredActiveCategory, translatedImages]
    );

    const handleCategoryChange = (nextCategory) => {
        startTransition(() => {
            setActiveCategory(nextCategory);
        });
    };

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
        <section id="gallery" className="overflow-hidden bg-[#fcfaf7] py-14 sm:py-16 md:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <span className="mb-4 block text-sm font-bold uppercase tracking-[0.28em] text-brand-gold">{t('gallery.kicker')}</span>
                    <h2 className="mb-10 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl md:mb-16 md:text-7xl">
                        {t('gallery.titleMain')} <span className="text-brand-blue">{t('gallery.titleAccent')}</span>
                    </h2>
                </div>
                
                <div className="mx-auto mb-10 flex max-w-4xl flex-wrap items-center justify-center gap-3 md:mb-14">
                    <button 
                        onClick={() => handleCategoryChange('all')}
                        className={`min-w-[74px] rounded-full border px-5 py-2.5 text-sm font-bold transition-all sm:min-w-[92px] sm:px-7 sm:text-base ${
                            activeCategory === 'all'
                                ? 'border-brand-blue bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-brand-blue/20 hover:bg-white hover:text-brand-blue'
                        }`}
                    >
                        {t('common.all')}
                    </button>
                    {usedCategories.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => handleCategoryChange(cat.name)}
                            className={`max-w-full rounded-full border px-5 py-2.5 text-sm font-bold transition-all sm:px-7 sm:text-base ${
                                activeCategory === cat.name
                                    ? 'border-brand-blue bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-brand-blue/20 hover:bg-white hover:text-brand-blue'
                            }`}
                        >
                            <span className="block max-w-[170px] truncate sm:max-w-none">
                                {getLocalizedField(cat, 'name', language, cat.name)}
                            </span>
                        </button>
                    ))}
                </div>

                <motion.div
                    layout
                    className={`grid auto-rows-[150px] grid-cols-2 gap-4 transition-opacity duration-150 sm:auto-rows-[180px] sm:gap-5 md:grid-cols-3 md:auto-rows-[190px] lg:auto-rows-[220px] xl:grid-cols-4 ${isPending ? 'opacity-75' : 'opacity-100'}`}
                >
                    <AnimatePresence mode="popLayout" initial={false}>
                        {filteredImages.map((img, index) => {
                            const localizedCaption = getLocalizedField(img, 'caption', language, img.caption);
                            const localizedCategory = getLocalizedField(img, 'category', language, img.category);
                            const cardLayout = getGalleryCardLayout(index);

                            return (
                            <motion.div
                                layout
                                key={img.id}
                                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 14, scale: 0.97 }}
                                transition={{ duration: 0.28, ease: 'easeOut' }}
                                className={`group relative min-h-0 cursor-pointer overflow-hidden rounded-[1.75rem] border border-white/90 bg-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:rounded-[2rem] ${cardLayout}`}
                                onClick={() => setSelectedImage(img)}
                            >
                                <img 
                                    src={img.image_url} 
                                    alt={localizedCaption}
                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172ae6] via-[#0f172a33] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 opacity-0 translate-y-3 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:p-4 md:p-5">
                                    <span className="w-fit rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue backdrop-blur">
                                        {localizedCategory || t('nav.gallery')}
                                    </span>
                                    <p className="line-clamp-2 text-sm font-bold leading-tight text-white drop-shadow-[0_4px_14px_rgba(15,23,42,0.45)] sm:text-base md:text-lg">
                                        {localizedCaption || localizedCategory || t('nav.gallery')}
                                    </p>
                                </div>
                            </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
                        onClick={() => setSelectedImage(null)}
                    >
                        <button className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10 sm:right-8 sm:top-8">
                            <X size={32} />
                        </button>
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative w-full max-w-5xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <img 
                                src={selectedImage.image_url} 
                                alt={getLocalizedField(selectedImage, 'caption', language, selectedImage.caption)} 
                                className="max-h-[78vh] w-full rounded-[1.75rem] object-contain shadow-2xl"
                            />
                            <div className="absolute inset-x-0 bottom-0 rounded-b-[1.75rem] bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-4 pt-10 sm:px-6 sm:pb-6">
                                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-gold">
                                    {getLocalizedField(selectedImage, 'category', language, selectedImage.category) || t('nav.gallery')}
                                </div>
                                <p className="text-base font-semibold text-white sm:text-xl">
                                    {getLocalizedField(selectedImage, 'caption', language, selectedImage.caption) || getLocalizedField(selectedImage, 'category', language, selectedImage.category) || t('nav.gallery')}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default Gallery;
