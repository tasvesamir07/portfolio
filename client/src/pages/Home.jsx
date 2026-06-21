import React from 'react';
import Hero from '../components/Hero';
import About from '../components/About';
import { useI18n } from '../i18n/I18nContext';
import { useSiteIdentity, usePublicPageData } from '../hooks/useSiteName';
import SEO from '../hooks/useSeo';

const Home = () => {
    const { name, siteName } = useSiteIdentity();
    const { data: pageData } = usePublicPageData();

    const aboutData = pageData?.about || null;
    const socialLinks = pageData?.socialLinks || pageData?.['social-links'] || [];

    return (
        <div className="bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={aboutData ? `${aboutData.name || name} | ${aboutData.site_name || siteName}` : `${name} | ${siteName}`}
                description={aboutData?.bio_short || `${name} - ${siteName}`}
                ogImage={aboutData?.logo_url}
            />
            <Hero data={aboutData} socialLinks={socialLinks} />
            <About data={aboutData} />
        </div>
    );
};

export default Home;
