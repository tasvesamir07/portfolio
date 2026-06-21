import React from 'react';
import Newspaper from '../components/Newspaper';
import { useSeo } from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const NewspaperPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();
    useSeo({
        title: `${t('nav.newspaper')} | ${siteName}`,
        description: `Newspaper coverage, press releases, media mentions, and news articles featuring ${siteName}.`
    });

    return (
        <div className="pt-20 bg-[#fcfaf7] min-h-screen">
            <Newspaper />
        </div>
    );
};

export default NewspaperPage;
