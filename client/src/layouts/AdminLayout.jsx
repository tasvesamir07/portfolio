import React, { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, FileText, Briefcase, GraduationCap, Image as ImageIcon, User, ExternalLink, Share2, Mail } from 'lucide-react';
const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('samir_portfolio_token');

    // Simple check - in a real app, you'd verify the token with the backend
    useEffect(() => {
        const path = window.location.pathname;
        if (!token && path !== '/admin') {
            navigate('/admin');
        } else if (token && path === '/admin') {
            navigate('/admin/dashboard');
        }
    }, [token, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('samir_portfolio_token');
        navigate('/admin');
    };

    if (!token && window.location.pathname !== '/admin') return null;

    if (window.location.pathname === '/admin') return <Outlet />;

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
