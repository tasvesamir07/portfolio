import React, { useEffect } from 'react';

export const useSeo = ({ title, description, ogImage, ogType = 'website' }) => {
    useEffect(() => {
        const stripHtml = (str) => {
            if (!str) return '';
            return str.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00A0/g, ' ').trim();
        };

        if (title) {
            const cleanTitle = stripHtml(title);
            document.title = cleanTitle;
            let ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) {
                ogTitle.setAttribute('content', cleanTitle);
            } else {
                ogTitle = document.createElement('meta');
                ogTitle.setAttribute('property', 'og:title');
                ogTitle.setAttribute('content', cleanTitle);
                document.head.appendChild(ogTitle);
            }
        }
        if (description) {
            const cleanDesc = stripHtml(description);
            let metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', cleanDesc);
            } else {
                metaDesc = document.createElement('meta');
                metaDesc.setAttribute('name', 'description');
                metaDesc.setAttribute('content', cleanDesc);
                document.head.appendChild(metaDesc);
            }

            let ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) {
                ogDesc.setAttribute('content', cleanDesc);
            } else {
                ogDesc = document.createElement('meta');
                ogDesc.setAttribute('property', 'og:description');
                ogDesc.setAttribute('content', cleanDesc);
                document.head.appendChild(ogDesc);
            }
        }
        if (ogImage) {
            let ogImg = document.querySelector('meta[property="og:image"]');
            if (ogImg) {
                ogImg.setAttribute('content', ogImage);
            } else {
                ogImg = document.createElement('meta');
                ogImg.setAttribute('property', 'og:image');
                ogImg.setAttribute('content', ogImage);
                document.head.appendChild(ogImg);
            }
        }
        
        let ogTp = document.querySelector('meta[property="og:type"]');
        if (ogTp) {
            ogTp.setAttribute('content', ogType);
        } else {
            ogTp = document.createElement('meta');
            ogTp.setAttribute('property', 'og:type');
            ogTp.setAttribute('content', ogType);
            document.head.appendChild(ogTp);
        }
    }, [title, description, ogImage, ogType]);
};

export const SEO = ({ title, description, ogImage, ogType }) => {
    useSeo({ title, description, ogImage, ogType });
    return null;
};

export default SEO;
