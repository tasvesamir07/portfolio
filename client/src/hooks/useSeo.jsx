import React from 'react';
import { Helmet } from 'react-helmet-async';

const stripHtml = (str) => {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00A0/g, ' ').trim();
};

export const useSeo = ({ title, description, ogImage, ogType = 'website' }) => {
    // Deprecated fallback hook that simply syncs document.title.
    // All pages are updated to use the declarative <SEO /> component instead.
    React.useEffect(() => {
        if (title) {
            document.title = stripHtml(title);
        }
    }, [title]);
};

export const SEO = ({ title, description, ogImage, ogType = 'website' }) => {
    const cleanTitle = title ? stripHtml(title) : '';
    const cleanDesc = description ? stripHtml(description) : '';

    return (
        <Helmet>
            {cleanTitle && <title>{cleanTitle}</title>}
            {cleanTitle && <meta property="og:title" content={cleanTitle} />}
            {cleanDesc && <meta name="description" content={cleanDesc} />}
            {cleanDesc && <meta property="og:description" content={cleanDesc} />}
            {ogImage && <meta property="og:image" content={ogImage} />}
            <meta property="og:type" content={ogType} />
        </Helmet>
    );
};

export default SEO;
