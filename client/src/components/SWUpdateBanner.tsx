// @ts-nocheck
import React, { useEffect } from 'react';

const SWUpdateBanner = () => {
    useEffect(() => {
        const handleUpdateAvailable = (event) => {
            const reg = event.detail;
            if (reg && reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        };

        window.addEventListener('sw:update-available', handleUpdateAvailable);

        return () => {
            window.removeEventListener('sw:update-available', handleUpdateAvailable);
        };
    }, []);

    return null;
};

export default SWUpdateBanner;
