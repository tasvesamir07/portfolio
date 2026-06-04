import React from 'react';
import Publications from '../components/Publications';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';

const PublicationsPage = () => {
    const { t } = useI18n();

    return (
        <div className="pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.publications')} | Samir Hossain`}
                description="Scholarly journals, publications, articles, conference publications, and papers by Samir Hossain."
            />
            <Publications />
        </div>
    );
};

export default PublicationsPage;
