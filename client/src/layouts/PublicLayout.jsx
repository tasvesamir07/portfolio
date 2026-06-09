import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PublicAppPreloader from '../components/PublicAppPreloader';
import DynamicFallback from '../pages/skeletons/DynamicFallback';
import StructuredData from '../components/StructuredData';
import Analytics from '../components/Analytics';
import BackToTop from '../components/BackToTop';

const PublicLayout = () => {
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
