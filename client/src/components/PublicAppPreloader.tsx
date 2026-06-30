// @ts-nocheck
import { useEffect, useRef } from 'react';
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

const LOAD_FALLBACK_DELAY_MS = 1200;
const IDLE_TIMEOUT_MS = 3500;
let routeWarmupPromise = null;

const getClientConnection = () => {
    if (typeof navigator === 'undefined') return null;
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
};

const getWarmupProfile = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return { shouldSkipWarmup: false };
    }

    const connection = getClientConnection();
    const effectiveType = String(connection?.effectiveType || '').toLowerCase();
    const saveData = connection?.saveData === true;
    const lowBandwidth = ['slow-2g', '2g', '3g'].includes(effectiveType);

    const viewportWidth = window.innerWidth || 0;
    const touchPoints = Number(navigator.maxTouchPoints || 0);
    const likelyMobile = viewportWidth > 0 && viewportWidth <= 1024 && touchPoints > 0;

    return {
        shouldSkipWarmup: saveData || lowBandwidth || likelyMobile
    };
};

const preloadPublicApp = () => {
    if (!routeWarmupPromise) {
        routeWarmupPromise = Promise.allSettled(PUBLIC_ROUTE_LOADERS.map((loadRoute) => loadRoute()));
    }
    return routeWarmupPromise;
};

const scheduleWarmup = () => {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const { shouldSkipWarmup } = getWarmupProfile();
    if (shouldSkipWarmup) {
        return () => {};
    }

    let idleId = null;
    let timeoutId = null;
    let cancelled = false;

    const runWarmup = () => {
        if (cancelled) return;
        preloadPublicApp();
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
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current || routeWarmupPromise) return;
        hasRun.current = true;
        return scheduleWarmup();
    }, [language]);

    return null;
};

export default PublicAppPreloader;
