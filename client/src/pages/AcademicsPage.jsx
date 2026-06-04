import React from 'react';
import Academics from '../components/Academics';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';

const AcademicsPage = () => {
    const { t } = useI18n();

    return (
        <div className="pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.education')} | Samir Hossain`}
                description="Academic background, passing years, educational qualifications, and degrees of Samir Hossain."
            />
            <Academics />
        </div>
    );
};

export default AcademicsPage;
