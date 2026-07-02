import React from 'react';
import Experiences from '../components/Experiences';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const ExperiencesPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20">
            <SEO 
                title={`${t('nav.experiences')} | ${siteName}`}
                description={`Professional work experiences, training workshops, and technical skills of ${siteName}.`}
            />
            <Experiences />
        </div>
    );
};

export default ExperiencesPage;
