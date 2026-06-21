import React from 'react';
import { useSiteIdentity, usePublicPageData } from '../hooks/useSiteName';

const StructuredData = () => {
    const { name, siteName, logoUrl, description } = useSiteIdentity();
    const { data: publicData } = usePublicPageData();
    const social = publicData?.socialLinks || publicData?.['social-links'] || [];

    if (!publicData?.about) return null;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": name,
        "url": window.location.origin,
        "image": logoUrl,
        "jobTitle": siteName,
        "description": description || "Professional portfolio showing academics, experience, and research.",
        "sameAs": social.map(link => link.url).filter(Boolean)
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
        </script>
    );
};

export default StructuredData;
