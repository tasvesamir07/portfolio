import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PublicAppPreloader from '../components/PublicAppPreloader';

const PublicLayout = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <PublicAppPreloader />
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default PublicLayout;
