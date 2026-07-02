import React, { useEffect } from 'react';

const SWUpdateBanner = () => {
    useEffect(() => {
        const handleUpdateAvailable = (event: CustomEvent) => {
            const reg = event.detail as ServiceWorkerRegistration & { waiting: ServiceWorker | null };
            if (reg && reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        };

        (window as any).addEventListener('sw:update-available', handleUpdateAvailable);

        return () => {
            (window as any).removeEventListener('sw:update-available', handleUpdateAvailable);
        };
    }, []);

    return null;
};

export default SWUpdateBanner;
