import { useEffect } from 'react';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';

const PUBLIC_ROUTE_LOADERS = [
    () => import('../pages/Home'),
    () => import('../pages/AcademicsPage'),
    () => import('../pages/ExperiencesPage'),
    () => import('../pages/ResearchInterestsPage'),
    () => import('../pages/PublicationsPage'),
    () => import('../pages/ResearchPage'),
    () => import('../pages/GalleryPage'),
    () => import('../pages/ContactPage'),
    () => import('../pages/DynamicPage')
];

const PUBLIC_ENDPOINTS = [
    '/about',
    '/social-links',
    '/pages',
    '/academics',
    '/experiences',
    '/trainings',
    '/skills',
    '/research-interests',
    '/research',
    '/publications',
    '/gallery',
    '/gallery-categories',
    '/projects'
];

const BATCH_SIZE = 4;
let routeWarmupPromise = null;
const languageWarmupPromises = new Map();

const runInBatches = async (items, batchSize, worker) => {
    for (let index = 0; index < items.length; index += batchSize) {
        const batch = items.slice(index, index + batchSize);
        await Promise.allSettled(batch.map(worker));
    }
};

const warmRouteBundles = () => {
    if (!routeWarmupPromise) {
        routeWarmupPromise = Promise.allSettled(PUBLIC_ROUTE_LOADERS.map((loadRoute) => loadRoute()));
    }

    return routeWarmupPromise;
};

const warmApiCache = async () => {
    await runInBatches(PUBLIC_ENDPOINTS, BATCH_SIZE, (endpoint) => api.get(endpoint));
};

const preloadPublicApp = (language) => {
    if (!languageWarmupPromises.has(language)) {
        languageWarmupPromises.set(
            language,
            Promise.allSettled([warmRouteBundles(), warmApiCache()]).finally(() => {
                languageWarmupPromises.delete(language);
            })
        );
    }

    return languageWarmupPromises.get(language);
};

const scheduleWarmup = (language) => {
    if (typeof window === 'undefined') {
        return () => {};
    }

    if (typeof window.requestIdleCallback === 'function') {
        const idleId = window.requestIdleCallback(() => {
            preloadPublicApp(language);
        }, { timeout: 1200 });

        return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(() => {
        preloadPublicApp(language);
    }, 150);

    return () => window.clearTimeout(timeoutId);
};

const PublicAppPreloader = () => {
    const { language } = useI18n();

    useEffect(() => scheduleWarmup(language), [language]);

    return null;
};

export default PublicAppPreloader;
