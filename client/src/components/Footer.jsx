import React, { useEffect, useState } from 'react';
import { Github, Linkedin, Mail, Twitter, Instagram, Globe, FileText } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';

const IconMap = {
    Github,
    Linkedin,
    Twitter,
    Mail,
    Instagram,
    Globe,
    FileText
};

const Footer = () => {
    const [socialLinks, setSocialLinks] = useState([]);
    const { language, t } = useI18n();

    useEffect(() => {
        const fetchLinks = async () => {
            try {
                const res = await api.get('/social-links');
                setSocialLinks(res.data);
            } catch (err) {
                console.error('Error fetching social links:', err);
            }
        };

        fetchLinks();
    }, [language]);

    return (
        <footer className="py-12 md:py-24 bg-[#ceb079] overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0b3b75]/20 to-transparent" />
            <div className="max-w-7xl mx-auto px-6 text-center">
                <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-10 md:mb-16">
                    {socialLinks.map((social, idx) => {
                        const IconComponent = IconMap[social.icon_name] || Globe;

                        return (
                            <a
                                key={social.id || idx}
                                href={social.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0b3b75]/60 transition-all hover:-translate-y-2 hover:text-[#0b3b75] drop-shadow-sm hover:drop-shadow-md"
                                title={social.platform}
                            >
                                <IconComponent size={32} strokeWidth={2} />
                            </a>
                        );
                    })}
                </div>

                <div className="w-1/2 max-w-lg h-[3px] bg-[#0b3b75] mx-auto mt-12 mb-8 rounded-full opacity-80" />

                <p className="text-[#0b3b75]/80 text-[10px] font-bold uppercase tracking-widest mb-2">{t('footer.developedWithPassion')}</p>
                <p className="text-[#0b3b75] font-bold text-sm uppercase tracking-widest italic opacity-60">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
            </div>
        </footer>
    );
};

export default Footer;
