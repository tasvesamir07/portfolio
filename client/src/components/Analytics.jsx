import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Analytics = () => {
    const location = useLocation();
    const gaId = import.meta.env.VITE_GA_ID;

    useEffect(() => {
        if (!gaId || typeof window === 'undefined') return;

        // Initialize Google Analytics
        if (!window.dataLayer) {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function gtag() {
                window.dataLayer.push(arguments);
            };
            window.gtag('js', new Date());

            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
            document.head.appendChild(script);
        }

        // Track page view on route transitions
        window.gtag('config', gaId, {
            page_path: location.pathname + location.search,
            page_location: window.location.href,
            page_title: document.title
        });
    }, [location.pathname, location.search, gaId]);

    return null;
};

export default Analytics;
