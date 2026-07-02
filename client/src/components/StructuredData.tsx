import React from 'react';
import { useSiteIdentity, usePublicPageData } from '../hooks/useSiteName';

const StructuredData = () => {
    const { name, siteName, logoUrl, description } = useSiteIdentity();
    const { data: publicData } = usePublicPageData();
    const social = (publicData as any)?.socialLinks || (publicData as any)?.['social-links'] || [];

    if (!(publicData as any)?.about) return null;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const jobTitle = (publicData as any).about.title || siteName;

    const personJsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": name,
        "url": baseUrl,
        "image": logoUrl,
        "jobTitle": jobTitle,
        "description": description || "Professional portfolio showing academics, experience, and research.",
        "sameAs": social.map((link: any) => link.url).filter(Boolean)
    };

    const websiteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": siteName,
        "url": baseUrl,
        "description": description || "Professional portfolio"
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify([personJsonLd, websiteJsonLd])}
        </script>
    );
};

export default StructuredData;
