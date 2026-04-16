import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import StructuredDetails from '../components/StructuredDetails';
import { parseStructuredItems } from '../utils/structuredItems';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedField, getLocalizedFirstField } from '../i18n/localize';

const normalizePageContent = (html = '') => {
    if (!html || typeof window === 'undefined') return html;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();

    while (textNode) {
        textNode.textContent = (textNode.textContent || '').replace(/\u00a0/g, ' ');
        textNode = walker.nextNode();
    }

    return doc.body.innerHTML.replace(/&nbsp;/gi, ' ');
};

const DynamicPage = () => {
    const { slug } = useParams();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { language, t } = useI18n();

    useEffect(() => {
        const fetchPage = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/pages/${slug}`);
                setPage(res.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching dynamic page:', err);
                setError('not-found');
            } finally {
                setLoading(false);
            }
        };
        fetchPage();
    }, [slug, language]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center pt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent-primary"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-4 text-center">
            <h2 className="text-4xl font-bold mb-4">404</h2>
            <p className="text-gray-400 mb-8">{t('dynamicPage.notFoundDescription')}</p>
            <Link to="/" className="btn-primary">{t('common.backToHome')}</Link>
        </div>
    );

    const structuredItems = parseStructuredItems(getLocalizedFirstField(page, ['details_json'], language, ''));
    const renderedContent = normalizePageContent(getLocalizedField(page, 'content', language, page?.content || ''));
    const pageTitle = getLocalizedField(page, 'title', language, page?.title || '');

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen pt-32 pb-20 px-4"
        >
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="dynamic-page-shell max-w-4xl mx-auto glass p-6 sm:p-8 md:p-12 rounded-[32px] border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden"
            >
                <h1 className="text-4xl sm:text-5xl font-black mb-8 md:mb-10 text-gray-900 tracking-tight break-words">{pageTitle}</h1>
                {structuredItems.length ? (
                    <StructuredDetails
                        items={structuredItems}
                        className="space-y-6 dynamic-page-content"
                        titleClassName="text-2xl font-black text-gray-900 leading-tight"
                        textClassName="text-gray-700 font-medium leading-8 break-words"
                        pairLabelClassName="text-gray-900 font-bold"
                        pairValueClassName="text-gray-700 font-medium leading-8 break-words"
                        valueStackClassName="space-y-3"
                    />
                ) : (
                    <div 
                        className="quill-content dynamic-page-content w-full max-w-none min-w-0 text-gray-700 font-medium"
                        dangerouslySetInnerHTML={{ __html: renderedContent }}
                    />
                )}
            </motion.div>
        </motion.div>
    );
};

export default DynamicPage;
