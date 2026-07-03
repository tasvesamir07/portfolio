import React, { useEffect, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { expireSessionAndRedirect, getStoredToken, isTokenExpired } from '../../utils/authSession';

const AdminAbout = lazy(() => import('./tabs/AdminAbout'));
const AdminProfile = lazy(() => import('./tabs/AdminProfile'));
const AdminAcademics = lazy(() => import('./tabs/AdminAcademics'));
const AdminExperiences = lazy(() => import('./tabs/AdminExperiences'));
const AdminTrainings = lazy(() => import('./tabs/AdminTrainings'));
const AdminSkills = lazy(() => import('./tabs/AdminSkills'));
const AdminResearchInterests = lazy(() => import('./tabs/AdminResearchInterests'));
const AdminPublications = lazy(() => import('./tabs/AdminPublications'));
const AdminBlog = lazy(() => import('./tabs/AdminBlog'));
const AdminGallery = lazy(() => import('./tabs/AdminGallery'));
const AdminMessages = lazy(() => import('./tabs/AdminMessages'));
const AdminSocial = lazy(() => import('./tabs/AdminSocial'));
const AdminNewspaper = lazy(() => import('./tabs/AdminNewspaper'));
const AdminTranslation = lazy(() => import('./tabs/AdminTranslation'));
const AdminAnonymousMessages = lazy(() => import('./tabs/AdminAnonymousMessages'));

const Dashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const VALID_TABS = ['about', 'profile', 'academics', 'experiences', 'trainings', 'skills', 'research-interests', 'publications', 'blog', 'gallery', 'messages', 'anonymous-messages', 'social', 'newspaper', 'translations'];
    const rawTab = searchParams.get('tab') || 'about';
    const activeTab = VALID_TABS.includes(rawTab) ? rawTab : 'about';

    useEffect(() => {
        const token = getStoredToken();
        if (!token || isTokenExpired(token)) {
            expireSessionAndRedirect({ showAlert: window.location.pathname !== '/admin' });
        }
    }, []);

    // Redirect unknown tabs back to default
    useEffect(() => {
        if (rawTab && !VALID_TABS.includes(rawTab)) {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [rawTab, navigate]);

    const renderTabComponent = () => {
        switch (activeTab) {
            case 'about':
                return <AdminAbout />;
            case 'profile':
                return <AdminProfile />;
            case 'academics':
                return <AdminAcademics />;
            case 'experiences':
                return <AdminExperiences />;
            case 'trainings':
                return <AdminTrainings />;
            case 'skills':
                return <AdminSkills />;
            case 'research-interests':
                return <AdminResearchInterests />;
            case 'publications':
                return <AdminPublications />;
            case 'blog':
                return <AdminBlog />;
            case 'gallery':
                return <AdminGallery />;
            case 'messages':
                return <AdminMessages />;
            case 'anonymous-messages':
                return <AdminAnonymousMessages />;
            case 'social':
                return <AdminSocial />;
            case 'newspaper':
                return <AdminNewspaper />;
            case 'translations':
                return <AdminTranslation />;
            default:
                return <AdminAbout />;
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 text-gray-900 min-h-screen bg-gray-50/20">
            
            <header className="flex flex-wrap justify-between items-center mb-10 gap-4 border-b pb-6">
                <div className="text-left">
                    <h1 className="text-3xl font-black uppercase text-gray-800 tracking-tight">{activeTab}</h1>
                    <p className="text-gray-500 text-sm font-medium">Content Management System / {activeTab}</p>
                </div>
            </header>

            <div className="bg-white rounded-lg p-6 md:p-10 border border-gray-200 shadow-sm">
                <Suspense
                    fallback={
                        <div className="text-center py-20 font-medium text-gray-500 flex flex-col items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent" />
                            <span>Loading section...</span>
                        </div>
                    }
                >
                    {renderTabComponent()}
                </Suspense>
            </div>
        </div>
    );
};

export default Dashboard;
