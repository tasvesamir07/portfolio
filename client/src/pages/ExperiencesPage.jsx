import React from 'react';
import Experiences from '../components/Experiences';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';

const ExperiencesPage = () => {
    const { t } = useI18n();

    return (
        <div className="pt-20">
            <SEO 
                title={`${t('nav.experiences')} | Samir Hossain`}
                description="Professional work experiences, training workshops, and technical skills of Samir Hossain."
            />
            <Experiences />
        </div>
    );
};

export default ExperiencesPage;
