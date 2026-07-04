import React from 'react';
import Membership from '../components/Membership';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const MembershipPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.membership')} | ${siteName}`}
                description={`Professional memberships, society memberships, and editorial board positions by ${siteName}.`}
            />
            <Membership />
        </div>
    );
};

export default MembershipPage;
