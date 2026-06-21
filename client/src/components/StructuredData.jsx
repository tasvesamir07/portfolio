import React from 'react';
import { usePublicPageData } from '../hooks/useSiteName';

const StructuredData = () => {
    const { data: publicData } = usePublicPageData();
    const about = publicData?.about;
    const social = publicData?.socialLinks || publicData?.['social-links'] || [];

    if (!about) return null;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": about.name || "Portfolio",
        "url": window.location.origin,
        "image": about.logo_url || "",
        "jobTitle": about.site_name || "Academic & Researcher",
        "description": about.bio_short || "Professional portfolio showing academics, experience, and research.",
        "sameAs": social.map(link => link.url).filter(Boolean)
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
        </script>
    );
};

export default StructuredData;
