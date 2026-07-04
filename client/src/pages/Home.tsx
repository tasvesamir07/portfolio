import React from 'react';
import Hero from '../components/Hero';
import About from '../components/About';
import { useI18n } from '../i18n/I18nContext';
import { useSiteIdentity, usePublicPageData } from '../hooks/useSiteName';
import SEO from '../hooks/useSeo';

const Home = () => {
    const { name, siteName } = useSiteIdentity();
    const { data: pageData } = usePublicPageData();

    const aboutData = (pageData?.about || null) as any;
    const socialLinks = (pageData?.socialLinks || pageData?.['social-links'] || []) as any[];

    return (
        <div className="bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={aboutData ? `${aboutData.name || name} | ${aboutData.site_name || siteName}` : `${name} | ${siteName}`}
                description={aboutData?.sub_bio || aboutData?.bio_text || `${name} - ${siteName}`}
                ogImage={aboutData?.logo_url}
            />
            <Hero data={aboutData} socialLinks={socialLinks} />
            <About data={aboutData} />
        </div>
    );
};

export default Home;
