import React from 'react';
import Gallery from '../components/Gallery';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';

const GalleryPage = () => {
    const { t } = useI18n();

    return (
        <div className="pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.gallery')} | Samir Hossain`}
                description="Visual gallery of memorable moments, workshops, presentations, academic events, and professional photography of Samir Hossain."
            />
            <Gallery />
        </div>
    );
};

export default GalleryPage;
