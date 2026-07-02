import React from 'react';
import { motion } from 'framer-motion';
import { getLocalizedField } from '../i18n/localize';
import { RenderInlineHtml } from '../utils/htmlRenderer';
import OptimizedImage from './OptimizedImage';

interface GalleryCardProps {
    img: any;
    index: number;
    language: string;
    t: (key: string) => string;
    onClick: () => void;
    prefersReduced: boolean;
    brokenImageIds: string[];
    setBrokenImageIds: React.Dispatch<React.SetStateAction<string[]>>;
    setSelectedImage: (img: any) => void;
    selectedImage: any;
}

const getGalleryCardLayout = (index: number) => {
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

const GalleryCard = React.memo(({ 
    img, 
    index, 
    language, 
    t, 
    onClick, 
    prefersReduced,
    brokenImageIds,
    setBrokenImageIds,
    setSelectedImage,
    selectedImage
}: GalleryCardProps) => {
    const cardLayout = getGalleryCardLayout(index);
    const localizedCaption = getLocalizedField(img, 'caption', language, img.caption);
    const localizedCategory = getLocalizedField(img, 'category', language, img.category);

    return (
        <motion.div
            layout={!prefersReduced}
            {...(!prefersReduced ? {
                initial: { opacity: 0, y: 18, scale: 0.97 },
                animate: { opacity: 1, y: 0, scale: 1 },
                exit: { opacity: 0, y: 14, scale: 0.97 },
                transition: { duration: 0.28, ease: 'easeOut' },
                whileHover: { scale: 1.02, y: -6 }
            } : {})}
            className={`group relative min-h-0 cursor-pointer overflow-hidden rounded-[1.75rem] border border-white/90  bg-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:rounded-[2rem] motion-card-hover ${cardLayout}`}
            onClick={onClick}
            tabIndex={0}
            role="button"
            aria-label={localizedCaption ? localizedCaption.replace(/<[^>]*>/g, '') : t('gallery.image') || 'Gallery image'}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            style={{ contentVisibility: 'auto', containIntrinsicSize: '300px' }}
        >
            {brokenImageIds.includes(img.id) ? (
                <div className="h-full w-full bg-slate-200 flex items-center justify-center text-gray-400">
                    <span className="text-xs uppercase font-bold tracking-wider">Image unavailable</span>
                </div>
            ) : (
                <OptimizedImage 
                    src={img.image_url} 
                    alt={localizedCaption ? localizedCaption.replace(/<[^>]*>/g, '') : t('gallery.image') || 'Gallery image'}
                    width={600}
                    height={450}
                    breakpoints={[300, 600, 900]}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    loading="lazy"
                    onError={() => {
                        setBrokenImageIds((current) => current.includes(img.id) ? current : [...current, img.id]);
                        if (selectedImage?.id === img.id) {
                            setSelectedImage(null);
                        }
                    }}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172ae6] via-[#0f172a33] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 opacity-0 translate-y-3 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:p-4 md:p-5">
                <span className="w-fit rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue backdrop-blur">
                    {localizedCategory || t('nav.gallery')}
                </span>
                <p className="line-clamp-2 text-sm font-bold leading-tight text-white drop-shadow-[0_4px_14px_rgba(15,23,42,0.45)] sm:text-base md:text-lg">
                    {localizedCaption ? <RenderInlineHtml html={localizedCaption} /> : (localizedCategory || t('nav.gallery'))}
                </p>
            </div>
        </motion.div>
    );
});

GalleryCard.displayName = 'GalleryCard';

export default GalleryCard;
