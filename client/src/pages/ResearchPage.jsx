import React from 'react';
import Research from '../components/Research';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';

const ResearchPage = () => {
    const { t } = useI18n();

    return (
        <div className="pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.research')} | Samir Hossain`}
                description="Scientific research projects, ongoing experiments, funding details, and achievements by Samir Hossain."
            />
            <Research />
        </div>
    );
};

export default ResearchPage;
