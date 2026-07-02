import React, { useMemo, useState, useTransition } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { getNoDataLabel } from '../utils/publicSectionState';
import { RenderInlineHtml } from '../utils/htmlRenderer';
import OptimizedImage from './OptimizedImage';
import GalleryCard from './GalleryCard';

import GallerySkeleton from '../pages/skeletons/GallerySkeleton';

const Gallery = () => {
    const prefersReduced = useReducedMotion();
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedImage, setSelectedImage] = useState<any | null>(null);
    const [brokenImageIds, setBrokenImageIds] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();
    const { language, t } = useI18n();
    const containerRef = useFocusTrap(!!selectedImage);

    const { data: images = [], isLoading: imagesLoading } = useQuery({
        queryKey: ['gallery', language],
        queryFn: async () => {
            const res = await api.get('/gallery');
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 30_000,
    });

    const { data: categories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ['gallery-categories', language],
        queryFn: async () => {
            const res = await api.get('/gallery-categories');
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 30_000,
    });

    const loading = imagesLoading || categoriesLoading;
    const translatedImages = images;
    const translatedCategories = categories;
    const noDataLabel = getNoDataLabel(language);


    const visibleImages = translatedImages;

    const usedCategories = useMemo(
        () => translatedCategories.filter((cat) => visibleImages.some((img) => img.category === cat.name)),
        [translatedCategories, visibleImages]
    );

    const filteredImages = useMemo(
        () => (activeCategory === 'all'
            ? visibleImages
            : visibleImages.filter((img) => img.category === activeCategory)),
        [activeCategory, visibleImages]
    );

    const handleCategoryChange = (nextCategory: string) => {
        startTransition(() => {
            setActiveCategory(nextCategory);
        });
    };

    if (loading) {
        return <GallerySkeleton />;
    }

    if (visibleImages.length === 0) {
        return (
            <section id="gallery" className="py-16 md:py-24 bg-[#fcfaf7] min-h-[60vh] flex items-center justify-center">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <span className="text-brand-gold font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('gallery.kicker')}</span>
                    <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-4 text-gray-900 tracking-tight">{t('gallery.titleMain')} <span className="text-brand-blue font-black">{t('gallery.titleAccent')}</span></h1>
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
                    <h1 className="mb-10 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl md:mb-16 md:text-7xl">
                        {t('gallery.titleMain')} <span className="text-brand-blue">{t('gallery.titleAccent')}</span>
                    </h1>
                </div>
                
                <div className="mx-auto mb-10 flex max-w-4xl flex-wrap items-center justify-center gap-3 md:mb-14">
                    <button 
                        onClick={() => handleCategoryChange('all')}
                        className={`min-w-[74px] rounded-full border px-5 py-2.5 text-sm font-bold transition-all sm:min-w-[92px] sm:px-7 sm:text-base ${
                            activeCategory === 'all'
                                ? 'border-brand-blue bg-brand-blue text-white    shadow-lg shadow-brand-blue/20 '
                                : 'border-gray-200 bg-white text-gray-600    hover:border-brand-blue/20 hover:bg-white hover:text-brand-blue  '
                        }`}
                        title={t('common.all') || 'All'}
                    >
                        {t('common.all')}
                    </button>
                    {usedCategories.map(cat => {
                        const localizedName = getLocalizedField(cat, 'name', language, cat.name);
                        return (
                            <button 
                                key={cat.id}
                                onClick={() => handleCategoryChange(cat.name)}
                                className={`max-w-full rounded-full border px-5 py-2.5 text-sm font-bold transition-all sm:px-7 sm:text-base ${
                                    activeCategory === cat.name
                                        ? 'border-brand-blue bg-brand-blue text-white    shadow-lg shadow-brand-blue/20 '
                                        : 'border-gray-200 bg-white text-gray-600    hover:border-brand-blue/20 hover:bg-white hover:text-brand-blue  '
                                }`}
                                title={localizedName}
                            >
                                <span className="block max-w-[170px] truncate sm:max-w-none">
                                    {localizedName}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <motion.div
                    layout={!prefersReduced}
                    className={`grid auto-rows-[150px] grid-cols-2 gap-4 transition-opacity duration-150 sm:auto-rows-[180px] sm:gap-5 md:grid-cols-3 md:auto-rows-[190px] lg:auto-rows-[220px] xl:grid-cols-4 ${isPending ? 'opacity-75' : 'opacity-100'}`}
                >
                    <AnimatePresence mode="popLayout" initial={false}>
                        {filteredImages.map((img, index) => (
                            <GalleryCard
                                key={img.id}
                                img={img}
                                index={index}
                                language={language}
                                t={t}
                                onClick={() => setSelectedImage(img)}
                                prefersReduced={prefersReduced}
                                brokenImageIds={brokenImageIds}
                                setBrokenImageIds={setBrokenImageIds}
                                setSelectedImage={setSelectedImage}
                                selectedImage={selectedImage}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div 
                        ref={containerRef}
                        {...(!prefersReduced ? {
                            initial: { opacity: 0 },
                            animate: { opacity: 1 },
                            exit: { opacity: 0 }
                        } : {})}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
                        onClick={() => setSelectedImage(null)}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Gallery Image Lightbox"
                        tabIndex={-1}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setSelectedImage(null);
                            }
                        }}
                    >
                        <button 
                            className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10 sm:right-8 sm:top-8 z-[10000] cursor-pointer"
                            onClick={() => setSelectedImage(null)}
                            aria-label="Close lightbox"
                        >
                            <X size={32} />
                        </button>
                        <motion.div
                            {...(!prefersReduced ? {
                                initial: { scale: 0.92, opacity: 0 },
                                animate: { scale: 1, opacity: 1 }
                            } : {})}
                            className="relative w-full max-w-5xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <OptimizedImage 
                                src={selectedImage.image_url} 
                                alt={(getLocalizedField(selectedImage, 'caption', language, selectedImage.caption) || t('gallery.image') || 'Gallery image').replace(/<[^>]*>/g, '')} 
                                width={1200}
                                height={900}
                                breakpoints={[600, 900, 1200, 1600]}
                                loading="eager"
                                onError={() => setSelectedImage(null)}
                                className="max-h-[78vh] w-full rounded-[1.75rem] object-contain shadow-2xl"
                            />
                            <div className="absolute inset-x-0 bottom-0 rounded-b-[1.75rem] bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-4 pt-10 sm:px-6 sm:pb-6">
                                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-gold">
                                    {getLocalizedField(selectedImage, 'category', language, selectedImage.category) || t('nav.gallery')}
                                </div>
                                <p className="text-base font-semibold text-white sm:text-xl text-left">
                                    {getLocalizedField(selectedImage, 'caption', language, selectedImage.caption) ? (
                                        <RenderInlineHtml html={getLocalizedField(selectedImage, 'caption', language, selectedImage.caption)} />
                                    ) : (
                                        getLocalizedField(selectedImage, 'category', language, selectedImage.category) || t('nav.gallery')
                                    )}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default React.memo(Gallery);
