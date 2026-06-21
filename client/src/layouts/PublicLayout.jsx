import React, { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PublicAppPreloader from '../components/PublicAppPreloader';
import DynamicFallback from '../pages/skeletons/DynamicFallback';
import StructuredData from '../components/StructuredData';
import Analytics from '../components/Analytics';
import BackToTop from '../components/BackToTop';
import { usePublicPageData } from '../hooks/useSiteName';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';

const PublicLayout = () => {
    usePublicPageData();
    const queryClient = useQueryClient();
    const { language } = useI18n();

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
        <div className="min-h-screen flex flex-col">
            <StructuredData />
            <Analytics />
            <PublicAppPreloader />
            <Navbar />
            <main className="flex-grow">
                <Suspense fallback={<DynamicFallback />}>
                    <Outlet />
                </Suspense>
            </main>
            <Footer />
            <BackToTop />
        </div>
    );
};

export default PublicLayout;
