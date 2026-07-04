import React from 'react';
import Team from '../components/Team';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const TeamPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.team')} | ${siteName}`}
                description={`Meet the team members, researchers, and students at ${siteName}.`}
            />
            <Team />
        </div>
    );
};

export default TeamPage;
