import React from 'react';
import Research from '../components/Research';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const ResearchPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.research')} | ${siteName}`}
                description={`Completed and ongoing research work, thesis, and research interests of ${siteName}.`}
            />
            <Research />
        </div>
    );
};

export default ResearchPage;
