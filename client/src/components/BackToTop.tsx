import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

const BackToTop = () => {
    const prefersReduced = useReducedMotion();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            setIsVisible(scrollTop > 200);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        // Also check if there's an active scrollable container in layouts
        const scrollableContainers = document.querySelectorAll('main.overflow-y-auto, .overflow-y-auto');
        scrollableContainers.forEach((container) => {
            container.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    {...(!prefersReduced ? {
                        initial: { opacity: 0, scale: 0.5, y: 20 },
                        animate: { opacity: 1, scale: 1, y: 0 },
                        exit: { opacity: 0, scale: 0.5, y: 20 }
                    } : {})}
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#ceb079] text-[#0b3b75] shadow-lg hover:bg-[#ceb079]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ceb079] transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    aria-label="Scroll to top"
                >
                    <ArrowUp size={24} strokeWidth={2.5} />
                </motion.button>
            )}
        </AnimatePresence>
    );
};

export default React.memo(BackToTop);
