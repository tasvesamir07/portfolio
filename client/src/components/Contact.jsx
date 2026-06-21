import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import ContactForm from './ContactForm';

const Contact = () => {
    const { t } = useI18n();

    return (
        <section id="contact" className="py-16 md:py-24 bg-[#fcfaf7]">
            <div className="max-w-3xl mx-auto px-6">
                <span className="text-brand-blue font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('contact.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-10 md:mb-16 text-gray-900 tracking-tight">{t('contact.titleMain')} <span className="text-brand-gold font-black">{t('contact.titleAccent')}</span></h2>
                
                <ContactForm />
            </div>
        </section>
    );
};

export default Contact;
