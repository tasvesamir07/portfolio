import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X } from 'lucide-react';

const StickySaveBar = ({ formId, saving, onCancel, saveLabel, headerRef }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!headerRef || !headerRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Show sticky bar when the header exits the top of the viewport
                setIsVisible(!entry.isIntersecting);
            },
            {
                root: null, // viewport
                rootMargin: '-80px 0px 0px 0px', // Trigger when header goes past 80px from top
                threshold: 0
            }
        );

        observer.observe(headerRef.current);

        return () => {
            observer.disconnect();
        };
    }, [headerRef]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="hidden lg:flex fixed top-0 left-0 right-0 md:left-[280px] bg-white/90 backdrop-blur-md border-b border-gray-200 py-4 px-8 justify-between items-center z-40 shadow-md transition-all"
                >
                    <div className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ceb079] animate-pulse"></span>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Unsaved changes in progress...</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={saving}
                            className="px-6 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-md font-bold text-xs text-gray-600 transition-all cursor-pointer disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form={formId}
                            disabled={saving}
                            className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                        >
                            <Save size={14} /> {saving ? 'Saving…' : saveLabel || 'Save Record'}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StickySaveBar;
