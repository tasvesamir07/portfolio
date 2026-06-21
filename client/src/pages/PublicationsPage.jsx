import React from 'react';
import Publications from '../components/Publications';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const PublicationsPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.publications')} | ${siteName}`}
                description={`Scholarly journals, publications, articles, conference publications, and papers by ${siteName}.`}
            />
            <Publications />
        </div>
    );
};

export default PublicationsPage;
