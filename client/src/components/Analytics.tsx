import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Analytics = () => {
    const location = useLocation();
    const gaId = import.meta.env.VITE_GA_ID;
    const w = typeof window !== 'undefined' ? (window as any) : undefined;

    useEffect(() => {
        if (!gaId || !w) return;

        if (!w.dataLayer) {
            w.dataLayer = [];
            w.gtag = function gtag() {
                w.dataLayer.push(arguments);
            };
            w.gtag('js', new Date());

            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
            document.head.appendChild(script);
        }

        w.gtag('config', gaId, {
            page_path: location.pathname + location.search,
            page_location: window.location.href,
            page_title: document.title
        });
    }, [location.pathname, location.search, gaId, w]);

    return null;
};

export default Analytics;
