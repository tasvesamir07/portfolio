import React, { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PublicAppPreloader from '../components/PublicAppPreloader';
import DynamicFallback from '../pages/skeletons/DynamicFallback';
import StructuredData from '../components/StructuredData';
import Analytics from '../components/Analytics';
import BackToTop from '../components/BackToTop';
import SWUpdateBanner from '../components/SWUpdateBanner';
import { usePublicPageData } from '../hooks/useSiteName';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';

const PublicLayout = () => {
    usePublicPageData();
    const queryClient = useQueryClient();
    const { language } = useI18n();
    const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            queryClient.prefetchQuery({
                queryKey: ['academics', language],
                queryFn: async () => {
                    const res = await api.get('/academics');
                    return Array.isArray(res.data) ? res.data : [];
                }
            });
            queryClient.prefetchQuery({
                queryKey: ['publications', language],
                queryFn: async () => {
                    const res = await api.get('/publications');
                    return Array.isArray(res.data) ? res.data : [];
                }
            });
            queryClient.prefetchQuery({
                queryKey: ['research', language],
                queryFn: async () => {
                    const res = await api.get('/research');
                    return Array.isArray(res.data) ? res.data : [];
                }
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, [language, queryClient]);

    return (
        <div className="min-h-screen flex flex-col dark:bg-background">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-white dark:focus:bg-slate-900 focus:text-[#0b3b75] dark:focus:text-brand-gold focus:font-bold focus:rounded-lg focus:shadow-xl focus:outline-2 focus:outline-[#ceb079]"
            >
                Skip to main content
            </a>
            {isOffline && (
                <div className="bg-amber-600 text-white text-center py-2 px-4 text-xs sm:text-sm font-semibold sticky top-0 z-50 flex items-center justify-center gap-2 animate-fade-in shadow-md">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    You are currently offline. Showing cached contents.
                </div>
            )}
            <StructuredData />
            <Analytics />
            <PublicAppPreloader />
            <Navbar />
            <main id="main-content" className="flex-grow">
                <Suspense fallback={<DynamicFallback />}>
                    <Outlet />
                </Suspense>
            </main>
            <Footer />
            <BackToTop />
            <SWUpdateBanner />
        </div>
    );
};

export default PublicLayout;
