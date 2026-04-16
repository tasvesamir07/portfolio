import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

const languageCodes = {
    en: 'EN',
    bn: 'BN',
    ko: 'KO'
};

const LanguageSwitcher = ({ className = '', fullWidth = false }) => {
    const { language, setLanguage, t, languages } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const activeLanguage = languages.find((item) => item.code === language) || languages[0];

    useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointerDown = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleSelect = (nextLanguage) => {
        setLanguage(nextLanguage);
        setIsOpen(false);
    };

    return (
        <div
            ref={containerRef}
            className={`relative ${fullWidth ? 'w-full' : 'w-[164px]'} ${className}`.trim()}
        >
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={t('common.language')}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className="flex h-11 w-full items-center justify-between rounded-xl border border-[#ceb079]/70 bg-white/10 px-4 text-left text-sm font-bold tracking-[0.04em] text-white outline-none transition-all hover:bg-white/15 focus:border-[#ceb079] focus:bg-white/15"
            >
                <span className="flex min-w-0 items-center gap-2.5">
                    <span className="rounded-md bg-white/12 px-2 py-1 text-[11px] font-black tracking-[0.14em] text-[#ceb079]" aria-hidden="true">
                        {languageCodes[activeLanguage?.code] || 'EN'}
                    </span>
                    <span className="truncate">{activeLanguage?.label || 'English'}</span>
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-white/80 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>

            <div
                className={`absolute right-0 top-[calc(100%+10px)] z-[1200] min-w-full overflow-hidden rounded-2xl border border-[#d9c296] bg-[#f7f1e3] shadow-[0_18px_40px_rgba(7,26,51,0.28)] transition-all duration-150 ${
                    isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
                }`}
                role="listbox"
                aria-label={t('common.language')}
            >
                <div className="border-b border-[#d9c296] bg-[#ead7aa] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#0b3b75]">
                    <span className="flex items-center gap-2">
                        <Languages size={14} />
                        <span>{t('common.language')}</span>
                    </span>
                </div>
                <div className="p-2">
                    {languages.map((item) => {
                        const isActive = item.code === language;

                        return (
                            <button
                                key={item.code}
                                type="button"
                                onClick={() => handleSelect(item.code)}
                                role="option"
                                aria-selected={isActive}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                                    isActive
                                        ? 'bg-[#0b5ed7] text-white'
                                        : 'text-[#16325c] hover:bg-white hover:text-[#0b3b75]'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <span
                                        className={`rounded-md px-2 py-1 text-[11px] font-black tracking-[0.14em] ${
                                            isActive ? 'bg-white/18 text-white' : 'bg-[#ead7aa] text-[#0b3b75]'
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {languageCodes[item.code] || item.shortLabel || 'EN'}
                                    </span>
                                    <span>{item.label}</span>
                                </span>
                                {isActive && <Check size={16} className="shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default LanguageSwitcher;
