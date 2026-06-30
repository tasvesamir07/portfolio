// @ts-nocheck
import React from 'react';
import ResearchInterests from '../components/ResearchInterests';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const ResearchInterestsPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.researchInterests')} | ${siteName}`}
                description={`Research interests, areas of specialization, and academic focus of ${siteName}.`}
            />
            <ResearchInterests />
        </div>
    );
};

export default ResearchInterestsPage;
