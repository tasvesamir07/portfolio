import React, { useEffect } from 'react';

export const useSeo = ({ title, description, ogImage, ogType = 'website' }) => {
    useEffect(() => {
        if (title) {
            document.title = title;
            let ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) {
                ogTitle.setAttribute('content', title);
            } else {
                ogTitle = document.createElement('meta');
                ogTitle.setAttribute('property', 'og:title');
                ogTitle.setAttribute('content', title);
                document.head.appendChild(ogTitle);
            }
        }
        if (description) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', description);
            } else {
                metaDesc = document.createElement('meta');
                metaDesc.setAttribute('name', 'description');
                metaDesc.setAttribute('content', description);
                document.head.appendChild(metaDesc);
            }

            let ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) {
                ogDesc.setAttribute('content', description);
            } else {
                ogDesc = document.createElement('meta');
                ogDesc.setAttribute('property', 'og:description');
                ogDesc.setAttribute('content', description);
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
