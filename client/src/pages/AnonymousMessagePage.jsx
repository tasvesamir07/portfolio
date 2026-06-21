import React from 'react';
import AnonymousMessageForm from '../components/AnonymousMessageForm';
import { useSeo } from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const AnonymousMessagePage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();
    useSeo({
        title: `${t('nav.anonymousMessage') || 'Send Anonymous Message'} | ${siteName}`,
        description: `Send a secure, private, and fully anonymous message to ${siteName}.`
    });

    return (
        <div className="pt-20 bg-[#fcfaf7] min-h-screen">
            <AnonymousMessageForm />
        </div>
    );
};

export default AnonymousMessagePage;
