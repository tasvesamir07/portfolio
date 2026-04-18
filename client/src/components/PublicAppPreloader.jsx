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

const CORE_PUBLIC_ENDPOINTS = [
    '/about',
    '/social-links',
    '/pages'
];

const SECONDARY_PUBLIC_ENDPOINTS = [
    '/academics',
    '/experiences',
    '/trainings',
    '/skills',
    '/research-interests',
    '/research',
    '/publications',
    '/gallery',
    '/gallery-categories'
];

const LOAD_FALLBACK_DELAY_MS = 1200;
const IDLE_TIMEOUT_MS = 3500;
let routeWarmupPromise = null;
const languageWarmupPromises = new Map();

const runWithConcurrency = async (items, concurrency, worker) => {
    if (!items.length) return;

    const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
    let nextIndex = 0;

    const workers = Array.from({ length: safeConcurrency }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++;
            await worker(items[currentIndex]);
        }
    });

    await Promise.allSettled(workers);
};

const getClientConnection = () => {
    if (typeof navigator === 'undefined') return null;
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
};

const getWarmupProfile = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return { shouldSkipWarmup: false, includeSecondaryWarmup: true };
    }

    const connection = getClientConnection();
    const effectiveType = String(connection?.effectiveType || '').toLowerCase();
    const saveData = connection?.saveData === true;
    const lowBandwidth = ['slow-2g', '2g', '3g'].includes(effectiveType);

    const viewportWidth = window.innerWidth || 0;
    const touchPoints = Number(navigator.maxTouchPoints || 0);
    const likelyMobile = viewportWidth > 0 && viewportWidth <= 1024 && touchPoints > 0;

    const deviceMemory = Number(navigator.deviceMemory || 0);
    const lowMemory = Number.isFinite(deviceMemory) && deviceMemory > 0 && deviceMemory <= 4;

    const cpuCores = Number(navigator.hardwareConcurrency || 0);
    const lowCpu = Number.isFinite(cpuCores) && cpuCores > 0 && cpuCores <= 4;
    const constrainedDevice = lowMemory || lowCpu;

    return {
        shouldSkipWarmup: saveData || lowBandwidth || likelyMobile,
        includeSecondaryWarmup: !constrainedDevice && !likelyMobile,
        apiWarmupConcurrency: constrainedDevice ? 2 : 4
    };
};

const warmRouteBundles = () => {
    if (!routeWarmupPromise) {
        routeWarmupPromise = Promise.allSettled(PUBLIC_ROUTE_LOADERS.map((loadRoute) => loadRoute()));
    }

    return routeWarmupPromise;
};

const warmApiCache = async (includeSecondaryWarmup, apiWarmupConcurrency) => {
    const endpoints = includeSecondaryWarmup
        ? [...CORE_PUBLIC_ENDPOINTS, ...SECONDARY_PUBLIC_ENDPOINTS]
        : CORE_PUBLIC_ENDPOINTS;

    await runWithConcurrency(endpoints, apiWarmupConcurrency, (endpoint) => api.get(endpoint));
};

const preloadPublicApp = (language, includeSecondaryWarmup, apiWarmupConcurrency) => {
    if (!languageWarmupPromises.has(language)) {
        languageWarmupPromises.set(
            language,
            Promise.allSettled([warmRouteBundles(), warmApiCache(includeSecondaryWarmup, apiWarmupConcurrency)]).finally(() => {
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

    const { shouldSkipWarmup, includeSecondaryWarmup, apiWarmupConcurrency } = getWarmupProfile();
    if (shouldSkipWarmup) {
        return () => {};
    }

    let idleId = null;
    let timeoutId = null;
    let cancelled = false;

    const runWarmup = () => {
        if (cancelled) return;
        preloadPublicApp(language, includeSecondaryWarmup, apiWarmupConcurrency);
    };

    const scheduleIdleWarmup = () => {
        if (typeof window.requestIdleCallback === 'function') {
            idleId = window.requestIdleCallback(runWarmup, { timeout: IDLE_TIMEOUT_MS });
            return;
        }

        timeoutId = window.setTimeout(runWarmup, LOAD_FALLBACK_DELAY_MS);
    };

    if (document.readyState === 'complete') {
        scheduleIdleWarmup();
    } else {
        window.addEventListener('load', scheduleIdleWarmup, { once: true });
    }

    return () => {
        cancelled = true;
        window.removeEventListener('load', scheduleIdleWarmup);

        if (idleId != null) {
            window.cancelIdleCallback?.(idleId);
        }

        if (timeoutId != null) {
            window.clearTimeout(timeoutId);
        }
    };
};

const PublicAppPreloader = () => {
    const { language } = useI18n();

    useEffect(() => scheduleWarmup(language), [language]);

    return null;
};

export default PublicAppPreloader;
