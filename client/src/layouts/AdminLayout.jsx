import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, FileText, Briefcase, GraduationCap, Image as ImageIcon, User, ExternalLink, Share2, Mail, Menu, X, Languages } from 'lucide-react';
import { clearSessionToken, expireSessionAndRedirect, getStoredToken, getTokenExpiryTime, isTokenExpired, SESSION_CHANGED_EVENT } from '../utils/authSession';
import api from '../api';
import BackToTop from '../components/BackToTop';

const MIN_SESSION_CHECK_INTERVAL_MS = 60000;

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = useState(() => getStoredToken());
    const [authReady, setAuthReady] = useState(() => location.pathname === '/admin');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const lastSessionCheckRef = useRef(0);

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
            const now = Date.now();
            if (now - lastSessionCheckRef.current < MIN_SESSION_CHECK_INTERVAL_MS) return;
            lastSessionCheckRef.current = now;

            const currentToken = getStoredToken();
            if (!currentToken) return;

            if (isTokenExpired(currentToken)) {
                expireSessionAndRedirect({ showAlert: location.pathname !== '/admin' });
                return;
            }

            try {
                const res = await api.get('/session', { enableAutoTranslate: false });
                if (res.data?.features) {
                    window.APP_FEATURES = res.data.features;
                }
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
            const now = Date.now();
            if (now - lastSessionCheckRef.current >= MIN_SESSION_CHECK_INTERVAL_MS) {
                validateSession();
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                if (now - lastSessionCheckRef.current >= MIN_SESSION_CHECK_INTERVAL_MS) {
                    validateSession();
                }
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
        <div className="h-screen flex flex-col md:flex-row bg-[#fcfaf7] overflow-hidden">
            {/* Mobile Header */}
            <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0 z-30">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-gray-500 hover:text-[#0b3b75] hover:bg-gray-50 rounded-xl transition-all"
                        aria-label="Open sidebar"
                    >
                        <Menu size={24} />
                    </button>
                    <h2 className="text-xl font-black text-[#0b3b75] tracking-tight">Admin Panel</h2>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                    title="Logout"
                >
                    <LogOut size={20} />
                </button>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" 
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    
                    {/* Drawer Content */}
                    <aside className="relative flex flex-col w-[280px] max-w-[85vw] bg-white h-full shadow-2xl z-50 transition-transform duration-300">
                        <div className="p-6 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
                            <h2 className="text-2xl font-black text-[#0b3b75] tracking-tighter">Admin Panel</h2>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                                aria-label="Close sidebar"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto pb-8 custom-scrollbar">
                            <div className="pb-2 px-3">
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
                                { id: 'anonymous-messages', label: 'Anon. Messages', icon: Mail },
                                { id: 'social', label: 'Social Links', icon: Share2 },
                                { id: 'newspaper', label: 'Newspaper', icon: FileText },
                                { id: 'translations', label: 'Translations', icon: Languages }
                            ].map(tab => (
                                <Link 
                                    key={tab.id}
                                    to={`/admin/dashboard?tab=${tab.id}`} 
                                    onClick={() => setIsMobileMenuOpen(false)}
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
                </div>
            )}

            {/* Desktop Sidebar */}
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
                        { id: 'anonymous-messages', label: 'Anon. Messages', icon: Mail },
                        { id: 'social', label: 'Social Links', icon: Share2 },
                        { id: 'newspaper', label: 'Newspaper', icon: FileText },
                        { id: 'translations', label: 'Translations', icon: Languages }
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
                <BackToTop />
            </main>
        </div>
    );
};

export default AdminLayout;
