import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedNavName, normalizeLabel } from '../i18n/localize';
import LanguageSwitcher from './LanguageSwitcher';

const isBlogMenuLink = (link = {}, t) => {
    const label = normalizeLabel(link.name);
    return (
        link.id === 'blog-menu'
        || label === 'blog'
        || label === normalizeLabel(t('nav.blog'))
        || (typeof link.path === 'string' && link.path.startsWith('/blog'))
    );
};

const isGalleryLink = (link = {}, t) => {
    const label = normalizeLabel(link.name);
    return (
        label === 'gallery'
        || label === normalizeLabel(t('nav.gallery'))
        || link.path === '/gallery'
        || link.path === '#gallery'
    );
};

const localizeLinkTree = (links, language, t) =>
    links.map((link) => {
        const rawChildren = link.dropdown || link.dropdownItems;
        const normalizedChildren = Array.isArray(rawChildren) ? rawChildren : [];
        const isDropdown = !!(normalizedChildren.length > 0 || link.isDropdown);

        return {
            ...link,
            name: getLocalizedNavName(link, language, t),
            dropdown: isDropdown ? localizeLinkTree(normalizedChildren, language, t) : undefined
        };
    });

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [about, setAbout] = useState(null);
    const [blogPages, setBlogPages] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(null);
    const location = useLocation();
    const { language, t } = useI18n();

    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const isActive = (path) => {
        if (!path || path === '#') return false;
        if (path === '/') return location.pathname === '/';
        return location.pathname === path;
    };

    useEffect(() => {
        const fetchNavbarData = async () => {
            try {
                const [aboutRes, pagesRes] = await Promise.all([
                    api.get('/about'),
                    api.get('/pages')
                ]);

                setAbout(aboutRes.data);
                setBlogPages((pagesRes.data || []).filter((page) => page.show_in_nav));
            } catch (err) {
                console.error('Error fetching navbar data:', err);
            }
        };

        fetchNavbarData();
    }, [language]);

    const baseNavLinks = about?.custom_nav?.length > 0 ? about.custom_nav : [
        { name: 'Home', path: '/' },
        {
            name: 'Personal Profile',
            dropdown: [
                { name: 'Education', path: '/academics' },
                { name: 'Experiences', path: '/experiences' },
                { name: 'Research Interests', path: '/research-interests' }
            ]
        },
        { name: 'Research', path: '/research' },
        { name: 'Publications', path: '/publications' },
        { name: 'Gallery', path: '/gallery' },
        { name: 'Contact', path: '/contact' }
    ];
    const localizedSiteName = getLocalizedField(about, 'site_name', language, about?.site_name || '');
    const localizedOwnerName = getLocalizedField(about, 'name', language, about?.name || '');
    const brandLabel = localizedSiteName?.trim() || localizedOwnerName?.trim() || 'Portfolio';

    const activeNavLinks = (() => {
        const normalizedLinks = baseNavLinks.map((link) => ({ ...link }));

        const blogLink = {
            id: 'blog-menu',
            name: 'Blog', // Will be localized by localizeLinkTree
            dropdown: blogPages.map((page) => ({
                name: getLocalizedField(page, 'title', language, page.title),
                path: `/blog/${page.slug}`
            }))
        };

        const existingBlogIndex = normalizedLinks.findIndex((link) => isBlogMenuLink(link, t));

        if (blogPages.length > 0) {
            if (existingBlogIndex >= 0) {
                normalizedLinks[existingBlogIndex] = {
                    ...normalizedLinks[existingBlogIndex],
                    id: 'blog-menu',
                    dropdown: blogLink.dropdown
                };
            } else {
                const insertIndex = normalizedLinks.findIndex((link) => isGalleryLink(link, t));
                if (insertIndex >= 0) {
                    normalizedLinks.splice(insertIndex, 0, blogLink);
                } else {
                    normalizedLinks.push(blogLink);
                }
            }
        } else if (existingBlogIndex >= 0 && !normalizedLinks[existingBlogIndex].dropdownItems?.length) {
            // Remove empty blog menu if no pages exist and it's not a custom one with items
            normalizedLinks.splice(existingBlogIndex, 1);
        }

        return localizeLinkTree(normalizedLinks, language, t);
    })();

    const flatMobileLinks = [];
    activeNavLinks.forEach((link) => {
        if (link.dropdown) {
            link.dropdown.forEach((subLink) => {
                flatMobileLinks.push(subLink);
            });
        } else {
            flatMobileLinks.push(link);
        }
    });

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 w-full z-[1000] py-3 bg-brand-blue border-b border-white/10 shadow-lg">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between gap-4">
                        <Link to="/" className="flex items-center gap-3 group min-w-0" onClick={() => setIsOpen(false)}>
                            {about?.logo_url ? (
                                <img src={about.logo_url} alt="Logo" className="w-14 h-14 object-contain group-hover:scale-105 transition-transform" />
                            ) : (
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-[#ceb079] font-black text-xl border border-white/20">
                                    {brandLabel[0]}
                                </div>
                            )}
                            {(brandLabel || !about?.logo_url) && (
                                <span className="text-lg sm:text-xl font-bold text-white tracking-tight truncate max-w-[150px] xs:max-w-xs sm:max-w-none">
                                    {brandLabel ? (
                                        brandLabel.trim().split(' ').map((word, i) => (
                                            <span key={i} className={i % 2 !== 0 ? 'text-[#ceb079]' : ''}>{word} </span>
                                        ))
                                    ) : (
                                        <>Port<span className="text-[#ceb079]">Folio</span></>
                                    )}
                                </span>
                            )}
                        </Link>

                        <div className="hidden lg:flex items-center gap-8">
                            {activeNavLinks.map((link, idx) => (
                                link.dropdown ? (
                                    <div
                                        key={idx}
                                        className="relative"
                                        onMouseEnter={() => setIsDropdownOpen(idx)}
                                        onMouseLeave={() => setIsDropdownOpen(null)}
                                    >
                                        <button className={`flex items-center gap-1.5 whitespace-nowrap text-[15px] font-bold tracking-tight transition-all hover:text-[#ceb079] ${(link.dropdown || []).some((entry) => isActive(entry.path)) ? 'text-[#ceb079]' : 'text-white'}`}>
                                            {link.name}
                                            {link.dropdown && (
                                                <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen === idx ? 'rotate-180' : ''}`} />
                                            )}
                                        </button>
                                        <div className={`absolute top-full left-1/2 -translate-x-1/2 w-56 pt-4 transition-all duration-200 origin-top ${isDropdownOpen === idx ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col">
                                                {link.dropdown.map((subLink, subIndex) => (
                                                    <Link
                                                        key={subIndex}
                                                        to={subLink.path || '#'}
                                                        className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === subLink.path ? 'bg-[#ceb079]/10 text-[#ceb079]' : 'text-gray-700 hover:bg-gray-50 hover:text-[#ceb079]'}`}
                                                    >
                                                        {subLink.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Link
                                        key={idx}
                                        to={link.path || '#'}
                                        className={`text-[15px] font-bold whitespace-nowrap tracking-tight transition-all hover:text-[#ceb079] ${isActive(link.path) ? 'text-[#ceb079]' : 'text-white'}`}
                                    >
                                        {link.name}
                                    </Link>
                                )
                            ))}
                        </div>

                        <div className="hidden lg:flex items-center gap-4">
                            <LanguageSwitcher />
                            {about?.resume_url && (
                                <a
                                    href={about.resume_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-[#ceb079] text-[#0b3b75] px-6 py-2.5 rounded font-black text-xs uppercase tracking-wider hover:bg-white transition-all shadow-sm hover:shadow-md active:scale-95"
                                >
                                    {t('nav.downloadCv')}
                                </a>
                            )}
                        </div>

                        <button
                            onClick={() => setIsOpen((prev) => !prev)}
                            className="lg:hidden p-2 text-white hover:text-brand-gold transition-colors"
                            aria-label={t('nav.toggleMenu')}
                        >
                            {isOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </nav>

            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999,
                        backgroundColor: '#0b3b75',
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            flexShrink: 0,
                            minHeight: '72px'
                        }}
                    >
                        <Link to="/" onClick={() => setIsOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {about?.logo_url ? (
                                <img src={about.logo_url} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                            ) : (
                                <div
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 12,
                                        background: 'rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ceb079',
                                        fontWeight: 900,
                                        fontSize: 20,
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}
                                >
                                    {brandLabel[0]}
                                </div>
                            )}
                            <span
                                style={{
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: 16,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '180px'
                                }}
                            >
                                {brandLabel}
                            </span>
                        </Link>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ padding: 8, color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}
                            aria-label={t('nav.toggleMenu')}
                        >
                            <X size={28} />
                        </button>
                    </div>

                    <div style={{ padding: '16px 24px 32px', flex: 1 }}>
                        <LanguageSwitcher className="mb-6 flex w-full justify-center" fullWidth />

                        {flatMobileLinks.map((link, idx) => (
                            <Link
                                key={idx}
                                to={link.path || '#'}
                                onClick={() => setIsOpen(false)}
                                style={{
                                    display: 'block',
                                    padding: '16px 16px',
                                    fontSize: 20,
                                    fontWeight: 700,
                                    color: isActive(link.path) ? '#ceb079' : 'white',
                                    textDecoration: 'none',
                                    borderBottom: idx < flatMobileLinks.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                    borderRadius: 8,
                                    transition: 'color 0.2s'
                                }}
                            >
                                {link.name}
                            </Link>
                        ))}

                        {about?.resume_url && (
                            <a
                                href={about.resume_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setIsOpen(false)}
                                style={{
                                    display: 'block',
                                    marginTop: 32,
                                    padding: '16px 32px',
                                    background: '#ceb079',
                                    color: '#0b3b75',
                                    textAlign: 'center',
                                    fontWeight: 900,
                                    fontSize: 13,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.15em',
                                    borderRadius: 12,
                                    textDecoration: 'none'
                                }}
                            >
                                {t('nav.downloadCv')}
                            </a>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;
