import React from 'react';
import Gallery from '../components/Gallery';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const GalleryPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.gallery')} | ${siteName}`}
                description={`Visual gallery of memorable moments, workshops, presentations, academic events, and professional photography of ${siteName}.`}
            />
            <Gallery />
        </div>
    );
};

export default GalleryPage;
