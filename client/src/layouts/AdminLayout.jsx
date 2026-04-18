import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, FileText, Briefcase, GraduationCap, Image as ImageIcon, User, ExternalLink, Share2, Mail } from 'lucide-react';
import { clearSessionToken, expireSessionAndRedirect, getStoredToken, getTokenExpiryTime, isTokenExpired, SESSION_CHANGED_EVENT } from '../utils/authSession';
import api from '../api';
const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = useState(() => getStoredToken());
    const [authReady, setAuthReady] = useState(() => location.pathname === '/admin');

    useEffect(() => {
        const syncToken = () => {
            setToken(getStoredToken());
        };

        window.addEventListener(SESSION_CHANGED_EVENT, syncToken);
        window.addEventListener('storage', syncToken);

        return () => {
            window.removeEventListener(SESSION_CHANGED_EVENT, syncToken);
            window.removeEventListener('storage', syncToken);
        };
    }, []);

    useLayoutEffect(() => {
        const path = location.pathname;
        const currentToken = getStoredToken();

        if (!currentToken) {
            setAuthReady(path === '/admin');
            if (path !== '/admin') {
                navigate('/admin', { replace: true });
            }
            return;
        }

        if (isTokenExpired(currentToken)) {
            setAuthReady(false);
            expireSessionAndRedirect({ showAlert: path !== '/admin' });
            return;
        }

        setAuthReady(true);
        if (currentToken && path === '/admin') {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [token, location.pathname, navigate]);

    useEffect(() => {
        if (!token) return undefined;

        let cancelled = false;

        const validateSession = async () => {
            const currentToken = getStoredToken();
            if (!currentToken) return;

            if (isTokenExpired(currentToken)) {
                expireSessionAndRedirect({ showAlert: location.pathname !== '/admin' });
                return;
            }

            try {
                await api.get('/session', { enableAutoTranslate: false });
            } catch (error) {
                if (!cancelled) {
                    expireSessionAndRedirect({
                        message: error?.response?.data?.message || 'Session expired. Please log in again.'
                    });
                }
            }
        };

        validateSession();

        const handleFocus = () => {
            validateSession();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                validateSession();
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [token, location.pathname]);

    useEffect(() => {
        if (!token || location.pathname === '/admin') return undefined;

        const expiresAt = getTokenExpiryTime(token);
        if (!expiresAt) {
            expireSessionAndRedirect();
            return undefined;
        }

        const msUntilExpiry = Math.max(0, expiresAt - Date.now());
        const timer = window.setTimeout(() => {
            expireSessionAndRedirect();
        }, msUntilExpiry);

        return () => window.clearTimeout(timer);
    }, [token, location.pathname]);

    const handleLogout = () => {
        clearSessionToken();
        navigate('/admin', { replace: true });
    };

    if (!authReady && location.pathname !== '/admin') return null;
    if (!token && location.pathname !== '/admin') return null;

    if (location.pathname === '/admin') return <Outlet />;

    return (
        <div className="h-screen flex bg-[#fcfaf7] overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[280px] h-full flex-shrink-0 bg-white border-r border-gray-100 hidden md:flex flex-col">
                <div className="p-8 flex-shrink-0">
                    <h2 className="text-3xl font-black text-[#0b3b75] tracking-tighter leading-none">Admin<br/>Panel</h2>
                </div>
                
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-8 custom-scrollbar">
                    <div className="pt-2 pb-2 px-3 mt-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Content Management</p>
                    </div>

                    {[
                        { id: 'about', label: 'Branding & About', icon: User },
                        { id: 'profile', label: 'Profile', icon: User },
                        { id: 'academics', label: 'Academics', icon: GraduationCap },
                        { id: 'experiences', label: 'Experiences', icon: Briefcase },
                        { id: 'trainings', label: 'Training', icon: ExternalLink },
                        { id: 'skills', label: 'Skills', icon: Share2 },
                        { id: 'research-interests', label: 'Interests', icon: FileText },
                        { id: 'research', label: 'Research', icon: Briefcase },
                        { id: 'publications', label: 'Publications', icon: ExternalLink },
                        { id: 'blog', label: 'Blog Pages', icon: FileText },
                        { id: 'gallery', label: 'Gallery', icon: ImageIcon },
                        { id: 'messages', label: 'Messages', icon: Mail },
                        { id: 'social', label: 'Social Links', icon: Share2 }
                    ].map(tab => (
                        <Link 
                            key={tab.id}
                            to={`/admin/dashboard?tab=${tab.id}`} 
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all font-bold text-sm ${new URLSearchParams(location.search).get('tab') === tab.id || (!new URLSearchParams(location.search).get('tab') && tab.id === 'about') ? 'bg-[#0b3b75]/5 text-[#0b3b75]' : 'hover:bg-gray-50 text-gray-400'}`}
                        >
                            <tab.icon size={18} /> {tab.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-6 border-t border-gray-100 flex-shrink-0 mt-auto bg-gray-50/30">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 text-red-500 hover:text-red-700 transition-all w-full font-bold text-sm px-3 py-2 rounded-lg hover:bg-red-50"
                    >
                        <LogOut size={18} /> Logout Session
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow h-full overflow-y-auto">
                <div className="min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
