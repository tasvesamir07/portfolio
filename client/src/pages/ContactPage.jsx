import React from 'react';
import Contact from '../components/Contact';
import SEO from '../hooks/useSeo';
import { useI18n } from '../i18n/I18nContext';
import { useSiteName } from '../hooks/useSiteName';

const ContactPage = () => {
    const { t } = useI18n();
    const siteName = useSiteName();

    return (
        <div className="pt-20 bg-[#fcfaf7] min-h-screen">
            <SEO 
                title={`${t('nav.contact')} | ${siteName}`}
                description={`Get in touch with ${siteName}. Submit questions, project inquiries, or collaborative opportunities.`}
            />
            <Contact />
        </div>
    );
};

export default ContactPage;
