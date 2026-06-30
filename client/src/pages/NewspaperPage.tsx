// @ts-nocheck
import React from 'react';
import Newspaper from '../components/Newspaper';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const NewspaperPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-16 xl:pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO
                title={`${t('nav.newspaper')} | ${siteName}`}
                description={`Newspaper coverage, press releases, media mentions, and news articles featuring ${siteName}.`}
            />
            <Newspaper />
        </div>
    );
};

export default NewspaperPage;
