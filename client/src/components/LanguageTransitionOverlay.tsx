// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { useI18n } from '../i18n/I18nContext';

const FLAGS = {
    en: '🇺🇸',
    bn: '🇧🇩',
    ko: '🇰🇷'
};

const LABELS = {
    en: 'English',
    bn: 'বাংলা',
    ko: '한국어'
};

const MIN_DISPLAY_MS = 800;

const LanguageTransitionOverlay = () => {
    const { language } = useI18n();
    const fetchCount = useIsFetching();
    const [phase, setPhase] = useState('hidden');
    const changeRef = useRef(null);
    const prevLangRef = useRef(language);
    const [isChanging, setIsChanging] = useState(false);

    // Detect language change
    useEffect(() => {
        if (prevLangRef.current === language) return;
        prevLangRef.current = language;
        setIsChanging(true);
    }, [language]);

    // Delayed entrance if fetching is active
    useEffect(() => {
        if (!isChanging) return;

        if (fetchCount === 0) {
            setIsChanging(false);
            setPhase('hidden');
            return;
        }

        const delayTimeout = setTimeout(() => {
            if (fetchCount > 0) {
                changeRef.current = Date.now();
                setPhase('entering');
                const enteringTimeout = setTimeout(() => setPhase('visible'), 200);
                return () => clearTimeout(enteringTimeout);
            } else {
                setIsChanging(false);
            }
        }, 150);

        return () => clearTimeout(delayTimeout);
    }, [isChanging, fetchCount]);

    // Check if it's safe to exit
    useEffect(() => {
        if (phase !== 'visible') return;

        const checkExit = () => {
            const elapsed = Date.now() - (changeRef.current || 0);
            if (elapsed >= MIN_DISPLAY_MS && fetchCount === 0) {
                setPhase('exiting');
                setIsChanging(false);
                const exitingTimeout = setTimeout(() => setPhase('hidden'), 400);
                return () => clearTimeout(exitingTimeout);
            }
        };

        const interval = setInterval(checkExit, 100);
        return () => clearInterval(interval);
    }, [phase, fetchCount]);

    if (phase === 'hidden') return null;

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-500 ${
            phase === 'entering' || phase === 'visible'
                ? 'bg-black/75 backdrop-blur-sm opacity-100' 
                : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'
        }`}>
            <div className={`text-center transition-all duration-300 ${
                phase === 'entering' || phase === 'visible'
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-4 opacity-0'
            }`}>
                <div className="text-6xl mb-4 animate-pulse">{FLAGS[language] || '🌐'}</div>
                <p className="text-white text-lg font-semibold tracking-wide">
                    Translating to {LABELS[language] || language}…
                </p>
                <div className="mt-4 flex justify-center gap-1.5">
                    {[0, 150, 300].map(delay => (
                        <span 
                            key={delay} 
                            className="w-2.5 h-2.5 bg-white/90 rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}ms` }} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LanguageTransitionOverlay;
