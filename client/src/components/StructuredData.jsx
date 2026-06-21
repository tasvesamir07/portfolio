import React, { useEffect, useState } from 'react';
import api from '../api';

const StructuredData = () => {
    const [meta, setMeta] = useState(null);

    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const res = await api.get('/page-data?resources=about,social-links');
                const about = res.data.about;
                const social = res.data.socialLinks || res.data['social-links'] || [];
                if (about) {
                    setMeta({ about, social });
                }
            } catch (err) {
                console.error('Error fetching structured data:', err);
            }
        };
        fetchMeta();
    }, []);

    if (!meta) return null;

    const { about, social } = meta;
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
