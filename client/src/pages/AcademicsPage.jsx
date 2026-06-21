import React from 'react';
import Academics from '../components/Academics';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const AcademicsPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.education')} | ${siteName}`}
                description={`Academic background, passing years, educational qualifications, and degrees of ${siteName}.`}
            />
            <Academics />
        </div>
    );
};

export default AcademicsPage;
