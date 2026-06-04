import React from 'react';
import ResearchInterests from '../components/ResearchInterests';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';

const ResearchInterestsPage = () => {
    const { t } = useI18n();

    return (
        <div className="pt-20">
            <SEO 
                title={`${t('nav.researchInterests')} | Samir Hossain`}
                description="Research interests, key research topics, and focus areas of Samir Hossain."
            />
            <ResearchInterests />
        </div>
    );
};

export default ResearchInterestsPage;
