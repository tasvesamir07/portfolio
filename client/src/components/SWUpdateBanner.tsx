// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

const SWUpdateBanner = () => {
    const [registration, setRegistration] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleUpdateAvailable = (event) => {
            if (event.detail) {
                setRegistration(event.detail);
                setIsVisible(true);
            }
        };

        window.addEventListener('sw:update-available', handleUpdateAvailable);

        return () => {
            window.removeEventListener('sw:update-available', handleUpdateAvailable);
        };
    }, []);

    const handleUpdate = () => {
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white/95 backdrop-blur-md border border-gray-200/60 rounded-xl shadow-2xl p-4 transition-all duration-500 ease-out transform translate-y-0 opacity-100 animate-slide-up">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 bg-[#0b3b75]/10 p-2 rounded-lg text-[#0b3b75]">
                    <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div className="flex-grow min-w-0 pt-0.5">
                    <h4 className="text-sm font-bold text-gray-900">
                        Update Available
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                        A new version of this website is available. Refresh now to get the latest features.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={handleUpdate}
                            className="bg-[#0b3b75] hover:bg-[#082a54] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default SWUpdateBanner;
