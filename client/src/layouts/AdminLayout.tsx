// @ts-nocheck
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, FileText, Briefcase, GraduationCap, Image as ImageIcon, User, ExternalLink, Share2, Mail, Menu, X, Languages, GripVertical } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { clearSessionToken, expireSessionAndRedirect, getStoredToken, getTokenExpiryTime, isTokenExpired, SESSION_CHANGED_EVENT } from '../utils/authSession';
import api from '../api';
import BackToTop from '../components/BackToTop';
import TranslateAllButton from '../components/TranslateAllButton';

const MIN_SESSION_CHECK_INTERVAL_MS = 60000;

const SIDEBAR_TABS = [
    { id: 'about', label: 'Branding & About', icon: User },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'academics', label: 'Academics', icon: GraduationCap },
    { id: 'experiences', label: 'Experiences', icon: Briefcase },
    { id: 'trainings', label: 'Training', icon: ExternalLink },
    { id: 'skills', label: 'Skills', icon: Share2 },
    { id: 'research-interests', label: 'Interests', icon: FileText },
    { id: 'research', label: 'Research', icon: Briefcase },
    { id: 'publications', label: 'Publications', icon: ExternalLink },
    { id: 'newspaper', label: 'Newspaper', icon: FileText },
    { id: 'blog', label: 'Blog Pages', icon: FileText },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'messages', label: 'Messages', icon: Mail },
    { id: 'anonymous-messages', label: 'Anon. Messages', icon: Mail },
    { id: 'social', label: 'Social Links', icon: Share2 },
    { id: 'translations', label: 'Translations', icon: Languages }
];

const SidebarLinks = ({ activeTab, onClickLink, tabs, draggedIndex, onDragStart, onDragOver, onDragEnd }) => {
    return (
        <>
            {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id || (!activeTab && tab.id === 'about');
                return (
                    <div
                        key={tab.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, index)}
                        onDragOver={(e) => onDragOver(e, index)}
                        onDragEnd={onDragEnd}
                        className={`flex items-center gap-1 rounded-xl transition-all cursor-grab active:cursor-grabbing group ${
                            isActive ? 'bg-[#0b3b75]/5  text-[#0b3b75] ' : 'text-gray-400  hover:bg-gray-50  hover:text-gray-700 '
                        } ${
                            draggedIndex === index 
                                ? 'opacity-40 border-dashed border border-brand-blue/30  bg-gray-50 ' 
                                : ''
                        }`}
                    >
                        <div className="pl-3 text-gray-300 group-hover:text-gray-400 cursor-grab shrink-0">
                            <GripVertical size={14} />
                        </div>
                        <Link 
                            to={`/admin/dashboard?tab=${tab.id}`} 
                            onClick={onClickLink}
                            className="flex-grow flex items-center gap-2.5 py-3 pr-3 font-bold text-sm decoration-transparent"
                        >
                            <Icon size={16} className="shrink-0" /> <span className="truncate">{tab.label}</span>
                        </Link>
                    </div>
                );
            })}
        </>
    );
};

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [token, setToken] = useState(() => getStoredToken());
    const [authReady, setAuthReady] = useState(() => location.pathname === '/admin');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const lastSessionCheckRef = useRef(0);

    const activeTab = new URLSearchParams(location.search).get('tab');

    const [aboutData, setAboutData] = useState(null);
    const [tabs, setTabs] = useState(SIDEBAR_TABS);
    const [draggedIndex, setDraggedIndex] = useState(null);

    const draggedIndexRef = useRef(null);
    const tabsRef = useRef(tabs);

    useEffect(() => {
        tabsRef.current = tabs;
    }, [tabs]);

    // Fetch about data to load custom_sidebar_order
    useEffect(() => {
        if (token) {
            api.get('/about')
                .then(res => {
                    setAboutData(res.data);
                })
                .catch(err => console.error('Failed to load about data:', err));
        }
    }, [token]);

    // Re-sort tabs whenever aboutData changes
    useEffect(() => {
        if (aboutData?.custom_sidebar_order && Array.isArray(aboutData.custom_sidebar_order)) {
            const sorted = [];
            aboutData.custom_sidebar_order.forEach(id => {
                const found = SIDEBAR_TABS.find(t => t.id === id);
                if (found) sorted.push(found);
            });
            // Append missing tabs
            SIDEBAR_TABS.forEach(tab => {
                if (!sorted.find(t => t.id === tab.id)) {
                    sorted.push(tab);
                }
            });
            setTabs(sorted);
        } else {
            setTabs(SIDEBAR_TABS);
        }
    }, [aboutData]);

    const handleDragStart = (e, index) => {
        draggedIndexRef.current = index;
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        const currentDragIdx = draggedIndexRef.current;
        if (currentDragIdx === null || currentDragIdx === index) return;

        const newTabs = [...tabsRef.current];
        const draggedItem = newTabs[currentDragIdx];
        newTabs.splice(currentDragIdx, 1);
        newTabs.splice(index, 0, draggedItem);
        
        draggedIndexRef.current = index;
        tabsRef.current = newTabs;
        setDraggedIndex(index);
        setTabs(newTabs);
    };

    const buildCustomNav = (sortedSidebarIds) => {
        const customNav = [{ name: 'Home', path: '/' }];
        const addedNodes = new Set(['home']);

        sortedSidebarIds.forEach(id => {
            if (id === 'academics' || id === 'experiences' || id === 'research-interests') {
                if (!addedNodes.has('personal-profile')) {
                    addedNodes.add('personal-profile');
                    const dropdownItems = [];
                    sortedSidebarIds.forEach(subId => {
                        if (subId === 'academics') {
                            dropdownItems.push({ name: 'Education', path: '/academics' });
                        } else if (subId === 'experiences') {
                            dropdownItems.push({ name: 'Experiences', path: '/experiences' });
                        } else if (subId === 'research-interests') {
                            dropdownItems.push({ name: 'Research Interests', path: '/research-interests' });
                        }
                    });
                    customNav.push({
                        name: 'Personal Profile',
                        dropdown: dropdownItems
                    });
                }
            } else if (id === 'research') {
                if (!addedNodes.has('research')) {
                    addedNodes.add('research');
                    customNav.push({ name: 'Research', path: '/research' });
                }
            } else if (id === 'publications') {
                if (!addedNodes.has('publications')) {
                    addedNodes.add('publications');
                    customNav.push({ name: 'Publications', path: '/publications' });
                }
            } else if (id === 'newspaper') {
                if (!addedNodes.has('newspaper')) {
                    addedNodes.add('newspaper');
                    customNav.push({ name: 'Newspaper', path: '/newspaper' });
                }
            } else if (id === 'gallery') {
                if (!addedNodes.has('gallery')) {
                    addedNodes.add('gallery');
                    customNav.push({ name: 'Gallery', path: '/gallery' });
                }
            } else if (id === 'messages') {
                if (!addedNodes.has('contact')) {
                    addedNodes.add('contact');
                    customNav.push({ name: 'Contact', path: '/contact' });
                }
            } else if (id === 'anonymous-messages') {
                if (!addedNodes.has('anonymous-message')) {
                    addedNodes.add('anonymous-message');
                    customNav.push({ name: 'Anon. Message', path: '/anonymous-message' });
                }
            }
        });

        return customNav;
    };

    const handleDragEnd = async () => {
        draggedIndexRef.current = null;
        setDraggedIndex(null);
        const finalTabs = tabsRef.current;
        const newOrder = finalTabs.map(t => t.id);
        const newCustomNav = buildCustomNav(newOrder);

        try {
            const payload = {
                custom_sidebar_order: newOrder,
                custom_nav: newCustomNav
            };
            const res = await api.put('/about', payload);
            setAboutData(res.data);
            
            // Clear local cache for translation
            window.dispatchEvent(new CustomEvent('portfolio:languageChange'));
            
            // Invalidate React Query public cache to trigger re-fetch of custom navigation
            queryClient.invalidateQueries({ queryKey: ['public-page-data'] });
        } catch (err) {
            console.error('Failed to save tab reorder:', err);
        }
    };


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
            <a
                href="#admin-main"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-[#0b3b75] focus:text-white focus:font-bold focus:rounded-lg focus:shadow-xl focus:outline-2 focus:outline-[#ceb079]"
            >
                Skip to main content
            </a>
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

                            <SidebarLinks 
                                activeTab={activeTab} 
                                onClickLink={() => setIsMobileMenuOpen(false)} 
                                tabs={tabs}
                                draggedIndex={draggedIndex}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragEnd={handleDragEnd}
                            />
                            <div className="pt-4 px-3">
                                <TranslateAllButton />
                            </div>
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

                    <SidebarLinks 
                        activeTab={activeTab} 
                        tabs={tabs}
                        draggedIndex={draggedIndex}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    />
                    <div className="pt-4 px-3">
                        <TranslateAllButton />
                    </div>
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
            <main id="admin-main" className="flex-grow h-full overflow-y-auto">
                <div className="min-h-full">
                    <Outlet />
                </div>
                <BackToTop />
            </main>
        </div>
    );
};

export default AdminLayout;
