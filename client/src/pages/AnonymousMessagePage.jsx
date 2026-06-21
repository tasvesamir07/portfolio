import React from 'react';
import AnonymousMessageForm from '../components/AnonymousMessageForm';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const AnonymousMessagePage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO
                title={`${t('nav.anonymousMessage') || 'Send Anonymous Message'} | ${siteName}`}
                description={`Send a secure, private, and fully anonymous message to ${siteName}.`}
            />
            <AnonymousMessageForm />
        </div>
    );
};

export default AnonymousMessagePage;
