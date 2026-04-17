import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import About from '../components/About';
import Academics from '../components/Academics';
import Research from '../components/Research';
import Projects from '../components/Projects';
import Gallery from '../components/Gallery';
import Contact from '../components/Contact';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';

const Home = () => {
    const [aboutData, setAboutData] = useState(null);
    const [socialLinks, setSocialLinks] = useState([]);
    const { language } = useI18n();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [aboutRes, socialRes] = await Promise.all([
                    api.get('/about'),
                    api.get('/social-links')
                ]);

                setAboutData(aboutRes.data);
                setSocialLinks(socialRes.data);
            } catch (err) {
                console.error('Error fetching home data:', err);
            }
        };
        fetchData();
    }, [language]);

    return (
        <div className="bg-[#fcfaf7] min-h-screen">
            <Hero data={aboutData} socialLinks={socialLinks} />
            <About data={aboutData} />
        </div>
    );
};

export default Home;
