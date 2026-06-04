import React from 'react';
import Newspaper from '../components/Newspaper';
import { useSeo } from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';

const NewspaperPage = () => {
    const { t } = useI18n();
    useSeo({
        title: `${t('nav.newspaper')} | Samir Hossain`,
        description: `Newspaper coverage, press releases, media mentions, and news articles featuring Samir Hossain.`
    });

    return (
        <div className="pt-20 bg-[#fcfaf7] min-h-screen">
            <Newspaper />
        </div>
    );
};

export default NewspaperPage;
