import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Hero from '../components/Hero';
import About from '../components/About';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import SEO from '../hooks/useSeo';

const Home = () => {
    const { language } = useI18n();

    const { data: pageData } = useQuery({
        queryKey: ['page-data', 'home', language],
        queryFn: async () => {
            const res = await api.get('/page-data?resources=about,social-links');
            return res.data;
        }
    });

    const aboutData = pageData?.about || null;
    const socialLinks = pageData?.socialLinks || pageData?.['social-links'] || [];

    return (
        <div className="bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={aboutData ? `${aboutData.name || 'Samir Hossain'} | ${aboutData.site_name || 'Portfolio'}` : 'Samir Hossain | Portfolio'}
                description={aboutData?.bio_short || 'Samir Hossain - Professional Portfolio'}
                ogImage={aboutData?.logo_url}
            />
            <Hero data={aboutData} socialLinks={socialLinks} />
            <About data={aboutData} />
        </div>
    );
};

export default Home;
