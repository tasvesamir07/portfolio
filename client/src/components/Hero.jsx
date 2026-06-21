import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField } from '../i18n/localize';
import { getSocialIcon } from '../utils/socialIcons';
import { RenderInlineHtml } from '../utils/htmlRenderer';

const Hero = ({ data, socialLinks = [] }) => {
    const { language, t } = useI18n();

    const name = getLocalizedField(data, 'name', language, data?.name);
    const title = getLocalizedField(data, 'title', language, data?.title);

    if (!data) {
        return (
            <section fetchpriority="high" className="w-full relative bg-[#0a2f5c] overflow-hidden flex flex-col items-center justify-center py-12 md:py-20 mt-16 xl:mt-20 border-b-4 border-brand-gold animate-pulse">
                <div className="max-w-5xl mx-auto px-6 relative z-10 w-full text-center">
                    <div className="flex flex-col items-center gap-6">
                        <div className="h-10 bg-white/10 rounded-lg w-64 xs:w-80 sm:w-96 md:w-[480px]"></div>
                        <div className="flex flex-wrap justify-center items-center gap-3 mt-4">
                            <div className="w-12 h-12 bg-white/10 rounded-lg"></div>
                            <div className="w-12 h-12 bg-white/10 rounded-lg"></div>
                            <div className="w-12 h-12 bg-white/10 rounded-lg"></div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section fetchpriority="high" className="w-full relative bg-gradient-to-br from-[#0a2f5c] to-[#12519e] overflow-hidden flex flex-col items-center justify-center py-12 md:py-20 mt-16 xl:mt-20 border-b-4 border-brand-gold">
            {/* Subtle tech background overlay */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
            
            <div className="max-w-5xl mx-auto px-6 relative z-10 w-full text-center">
                <div className="flex flex-col items-center gap-6">
                    {/* Name in Gold */}
                    <h1 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight sm:tracking-wide drop-shadow-lg uppercase text-brand-gold px-2 sm:px-4 leading-tight">
                        {name ? (
                            name
                        ) : title ? (
                            <RenderInlineHtml html={title} />
                        ) : (
                            t('hero.professionalPortfolio')
                        )}
                    </h1>

                    {/* Social Icons Row */}
                    <div className="flex flex-wrap justify-center items-center gap-3 mt-4">
                        {socialLinks.map((link, idx) => {
                            const IconComponent = getSocialIcon(link.icon_name || link.platform);
                            return (
                                <a 
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all group overflow-hidden relative"
                                    title={link.platform}
                                    aria-label={link.platform}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-gray-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <IconComponent 
                                        size={22} 
                                        className={`relative z-10 text-[#0b3b75] ${(link.color_class || '').replace('hover:', 'group-hover:')} transition-colors`} 
                                    />
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
