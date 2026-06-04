import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import About from '../components/About';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';
import SEO from '../hooks/useSeo';

const Home = () => {
    const [aboutData, setAboutData] = useState(null);
    const [socialLinks, setSocialLinks] = useState([]);
    const { language } = useI18n();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/page-data?resources=about,social-links');
                setAboutData(res.data.about);
                setSocialLinks(res.data.socialLinks || res.data['social-links'] || []);
            } catch (err) {
                console.error('Error fetching home data:', err);
            }
        };
        fetchData();
    }, [language]);

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
