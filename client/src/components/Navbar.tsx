/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedNavName, normalizeLabel } from '../i18n/localize';
import LanguageSwitcher from './LanguageSwitcher';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { usePublicPageData } from '../hooks/useSiteName';
import OptimizedImage from './OptimizedImage';

const isBlogMenuLink = (link: any = {}, t: any) => {
    const label = normalizeLabel(link.name);
    return (
        link.id === 'blog-menu'
        || label === 'blog'
        || label === normalizeLabel(t('nav.blog'))
        || (typeof link.path === 'string' && link.path.startsWith('/blog'))
    );
};

const isGalleryLink = (link: any = {}, t: any) => {
    const label = normalizeLabel(link.name);
    return (
        label === 'gallery'
        || label === normalizeLabel(t('nav.gallery'))
        || link.path === '/gallery'
        || link.path === '#gallery'
    );
};

const localizeLinkTree = (links: any[], language: any, t: any): any =>
    links.map((link: any) => {
        const rawChildren = link.dropdown || link.dropdownItems;
        const normalizedChildren = Array.isArray(rawChildren) ? rawChildren : [];
        const isDropdown = !!(normalizedChildren.length > 0 || link.isDropdown);

        return {
            ...link,
            name: getLocalizedNavName(link, language, t),
            dropdown: isDropdown ? localizeLinkTree(normalizedChildren, language, t) : undefined
        };
    });

const DEFAULT_NAV_LINKS = [
    { name: 'Home', path: '/' },
    {
        name: 'Personal Profile',
        dropdown: [
            { name: 'Education', path: '/academics' },
            { name: 'Experiences', path: '/experiences' },
            { name: 'Research Interests', path: '/research-interests' }
        ]
    },
    { name: 'Publications', path: '/publications' },
    { name: 'Conferences', path: '/conferences' },
    { name: 'Newspaper', path: '/newspaper' },
    { name: 'Contact', path: '/contact' },
    { name: 'Anon. Message', path: '/anonymous-message' }
];

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState<number | null>(null);
    const [logoBroken, setLogoBroken] = useState(false);
    const location = useLocation();
    const { language, t } = useI18n();

    const triggerRef = useRef(null);
    const menuContainerRef = useFocusTrap(isOpen, triggerRef);

    const { data: publicData } = usePublicPageData();
    const about = (publicData as any)?.about || null;
    const blogPages = useMemo(() => 
        ((publicData as any)?.pages || []).filter((page: any) => page.show_in_nav),
        [publicData?.pages]
    );

    useEffect(() => {
        setIsOpen(false);
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }, [location.pathname]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);

    const isActive = (path: any) => {
        if (!path || path === '#') return false;
        if (path === '/') return location.pathname === '/';
        return location.pathname === path;
    };

    const baseNavLinks = (about as any)?.custom_nav?.length > 0 ? (about as any).custom_nav : DEFAULT_NAV_LINKS;

    const stripHtml = (str: any) => {
        if (!str) return '';
        return str.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00A0/g, ' ').trim();
    };
    const localizedSiteName = stripHtml(getLocalizedField(about, 'site_name', language, about?.site_name || ''));
    const localizedOwnerName = stripHtml(getLocalizedField(about, 'name', language, about?.name || ''));
    const brandLabel = localizedSiteName || localizedOwnerName || 'Portfolio';

    const activeNavLinks = useMemo(() => {
        // Remove standalone Gallery if present (e.g. from old custom_nav data)
        let normalizedLinks = baseNavLinks.filter((link: any) => !isGalleryLink(link, t));

        const blogLink = {
            id: 'blog-menu',
            name: 'Blog',
            dropdown: [
                ...blogPages.map((page: any) => ({
                    name: stripHtml(getLocalizedField(page, 'title', language, page.title)),
                    path: `/blog/${page.slug}`
                })),
                { name: 'Gallery', path: '/gallery' }
            ]
        };

        const existingBlogIndex = normalizedLinks.findIndex((link: any) => isBlogMenuLink(link, t));

        if (existingBlogIndex >= 0) {
            normalizedLinks[existingBlogIndex] = {
                ...normalizedLinks[existingBlogIndex],
                id: 'blog-menu',
                dropdown: blogLink.dropdown
            };
        } else {
            normalizedLinks.push(blogLink);
        }

        return localizeLinkTree(normalizedLinks, language, t);
    }, [baseNavLinks, blogPages, language, t]);

    const groupedNavLinks = useMemo(() => {
        const moreItems: any[] = [];
        const mainItems: any[] = [];

        activeNavLinks.forEach((link: any) => {
            const path = link.path || '';
            const normalizedName = normalizeLabel(link.name);

            // Group Contact and Anon. Message under 'More'
            const isMoreTarget = 
                path === '/contact' ||
                path.includes('anonymous-message') ||
                normalizedName === 'contact' ||
                normalizedName.includes('anon') ||
                normalizedName.includes('benami');

            if (isMoreTarget) {
                moreItems.push(link);
            } else {
                mainItems.push(link);
            }
        });

        if (moreItems.length > 0) {
            mainItems.push({
                name: t('nav.more'),
                dropdown: moreItems
            });
        }

        return mainItems;
    }, [activeNavLinks, t]);

    const flatMobileLinks = useMemo(() => {
        const flat: any[] = [];
        activeNavLinks.forEach((link: any) => {
            if (link.dropdown) {
                link.dropdown.forEach((subLink: any) => {
                    flat.push(subLink);
                });
            } else {
                flat.push(link);
            }
        });
        return flat;
    }, [activeNavLinks]);

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 w-full z-[1000] h-16 xl:h-20 bg-brand-blue border-b border-white/10 shadow-lg flex items-center">
                <div className="max-w-7xl mx-auto px-6 w-full">
                    <div className="flex items-center justify-between gap-4">
                        <Link to="/" className="flex items-center gap-3 group min-w-0 flex-shrink-0" onClick={() => setIsOpen(false)}>
                            {about?.logo_url && !logoBroken ? (
                                <OptimizedImage
                                    src={about.logo_url}
                                    alt="Logo"
                                    width={56}
                                    height={56}
                                    breakpoints={[56]}
                                    fetchPriority="high"
                                    className="w-14 h-14 object-contain group-hover:scale-105 transition-transform"
                                    onError={() => setLogoBroken(true)}
                                />
                            ) : (
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-[#ceb079] font-black text-xl border border-white/20">
                                    {brandLabel[0]}
                                </div>
                            )}
                            {(brandLabel || !about?.logo_url) && (
                                <span className="text-lg sm:text-xl font-bold text-white tracking-tight truncate max-w-[150px] xs:max-w-xs sm:max-w-none">
                                    {brandLabel ? (
                                        brandLabel.trim().split(' ').map((word: any, i: number) => (
                                            <span key={i} className={i % 2 !== 0 ? 'text-[#ceb079]' : ''}>{word} </span>
                                        ))
                                    ) : (
                                        <>Port<span className="text-[#ceb079]">Folio</span></>
                                    )}
                                </span>
                            )}
                        </Link>

                        <div className="hidden xl:flex items-center gap-4 2xl:gap-8">
                            {groupedNavLinks.map((link: any, idx: number) => (
                                link.dropdown ? (
                                    <div
                                        key={idx}
                                        className="relative"
                                        onMouseEnter={() => setIsDropdownOpen(idx)}
                                        onMouseLeave={() => setIsDropdownOpen(null)}
                                    >
                                        <button className={`flex items-center gap-1 whitespace-nowrap text-[13px] 2xl:text-[15px] font-bold tracking-tight transition-all hover:text-[#ceb079] ${(link.dropdown || []).some((entry: any) => isActive(entry.path)) ? 'text-[#ceb079]' : 'text-white'}`}>
                                            {link.name}
                                            {link.dropdown && (
                                                <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen === idx ? 'rotate-180' : ''}`} />
                                            )}
                                        </button>
                                        <div className={`absolute top-full left-1/2 -translate-x-1/2 w-56 pt-4 transition-all duration-200 origin-top ${isDropdownOpen === idx ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col">
                                                {link.dropdown.map((subLink: any, subIndex: number) => (
                                                    <Link
                                                        key={subIndex}
                                                        to={subLink.path || '#'}
                                                        className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === subLink.path ? 'bg-[#ceb079]/10 text-[#ceb079]' : 'text-gray-700  hover:bg-gray-50  hover:text-[#ceb079]'}`}
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
                                        className={`text-[13px] 2xl:text-[15px] font-bold whitespace-nowrap tracking-tight transition-all hover:text-[#ceb079] ${isActive(link.path) ? 'text-[#ceb079]' : 'text-white'}`}
                                    >
                                        {link.name}
                                    </Link>
                                )
                            ))}
                        </div>

                        <div className="hidden xl:flex items-center gap-3 2xl:gap-4 flex-shrink-0">
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
                            ref={triggerRef}
                            onClick={() => setIsOpen((prev) => !prev)}
                            className="xl:hidden p-2 text-white hover:text-brand-gold transition-colors cursor-pointer"
                            aria-label={t('nav.toggleMenu')}
                        >
                            {isOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </nav>

            {isOpen && (
                <div
                    ref={menuContainerRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Mobile Navigation Menu"
                    className="fixed inset-0 z-[999] bg-[#0b3b75] flex flex-col overflow-y-auto"
                >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 min-h-[72px]">
                        <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3 decoration-transparent">
                            {about?.logo_url && !logoBroken ? (
                                <OptimizedImage
                                    src={about.logo_url}
                                    alt="Logo"
                                    width={40}
                                    height={40}
                                    breakpoints={[40]}
                                    fetchPriority="high"
                                    className="w-10 h-10 object-contain"
                                    onError={() => setLogoBroken(true)}
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#ceb079] font-black text-xl border border-white/20">
                                    {brandLabel[0]}
                                </div>
                            )}
                            <span className="text-white font-bold text-base truncate max-w-[180px]">
                                {brandLabel}
                            </span>
                        </Link>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-white bg-transparent border-none cursor-pointer"
                            aria-label={t('nav.toggleMenu')}
                        >
                            <X size={28} />
                        </button>
                    </div>

                    <div className="px-6 pt-4 pb-8 flex-1">
                        <div className="flex gap-3 mb-6 items-center">
                            <LanguageSwitcher className="flex-1" fullWidth />
                        </div>

                        {flatMobileLinks.map((link: any, idx: number) => (
                            <Link
                                key={idx}
                                to={link.path || '#'}
                                onClick={() => setIsOpen(false)}
                                className={`block px-4 py-4 text-xl font-bold rounded-lg transition-colors duration-200 decoration-transparent ${
                                    isActive(link.path) ? 'text-[#ceb079]' : 'text-white'
                                } ${idx < flatMobileLinks.length - 1 ? 'border-b border-white/10' : ''}`}
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
                                className="block mt-8 px-8 py-4 bg-[#ceb079] text-[#0b3b75] text-center font-black text-[13px] uppercase tracking-widest rounded-xl decoration-transparent hover:bg-white transition-all shadow-sm active:scale-95"
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

export default React.memo(Navbar);
