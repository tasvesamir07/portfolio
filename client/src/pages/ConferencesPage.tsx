import React from 'react';
import Conferences from '../components/Conferences';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const ConferencesPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.conferences')} | ${siteName}`}
                description={`Conference proceedings, academic conferences, and paper presentations by ${siteName}.`}
            />
            <Conferences />
        </div>
    );
};

export default ConferencesPage;
