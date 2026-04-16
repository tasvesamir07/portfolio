import axios from 'axios';
import { translateApiData } from './i18n/translator';

const STORAGE_KEY = 'portfolio-language';
const LANGUAGE_HEADER = 'X-Translate-Language';
const MAX_CACHED_GETS = 120;

const getResponseCache = new Map();
const pendingGetRequests = new Map();

const cloneData = (value) => {
    if (value == null) return value;

    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
};

const trimGetResponseCache = () => {
    if (getResponseCache.size <= MAX_CACHED_GETS) return;

    const oldestKey = getResponseCache.keys().next().value;
    if (oldestKey) {
        getResponseCache.delete(oldestKey);
    }
};

const buildGetCacheKey = (config, language) => {
    const baseUrl = config.baseURL || '';
    const url = config.url || '';
    const params = config.params ? JSON.stringify(config.params) : '';
    return `${language}::${baseUrl}::${url}::${params}`;
};

const resolveAdapter = (adapter, config) => {
    if (typeof adapter === 'function') {
        return adapter;
    }

    if (typeof axios.getAdapter === 'function') {
        return axios.getAdapter(adapter || api.defaults.adapter, config);
    }

    return api.defaults.adapter;
};

const cloneCachedResponse = (response, config) => ({
    ...response,
    data: cloneData(response.data),
    headers: { ...(response.headers || {}) },
    config
});
let defaultBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (defaultBaseUrl && !defaultBaseUrl.endsWith('/api') && !defaultBaseUrl.endsWith('/api/')) {
    defaultBaseUrl = defaultBaseUrl.replace(/\/$/, '') + '/api';
}

const api = axios.create({
    baseURL: defaultBaseUrl,
});

// Request interceptor for API calls
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('samir_portfolio_token');
        const requestLanguage = localStorage.getItem(STORAGE_KEY) || 'en';
        const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
        const method = String(config.method || 'get').toLowerCase();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        config.headers[LANGUAGE_HEADER] = requestLanguage;
        if (isAdminRoute && method === 'get') {
            config.headers['X-Skip-Auto-Translate'] = '1';
        }
        config.metadataLanguage = requestLanguage;

        const isCacheableGet = method === 'get'
            && !isAdminRoute
            && !String(config.url || '').includes('/translate');

        if (!isCacheableGet) {
            if (method !== 'get') {
                getResponseCache.clear();
                pendingGetRequests.clear();
            }
            return config;
        }

        const cacheKey = buildGetCacheKey(config, requestLanguage);
        config.metadataCacheKey = cacheKey;

        const cachedResponse = getResponseCache.get(cacheKey);
        if (cachedResponse) {
            config.adapter = async () => cloneCachedResponse(cachedResponse, config);
            return config;
        }

        const defaultAdapter = resolveAdapter(config.adapter || api.defaults.adapter, config);
        config.adapter = async (adapterConfig) => {
            if (pendingGetRequests.has(cacheKey)) {
                const pendingResponse = await pendingGetRequests.get(cacheKey);
                return cloneCachedResponse(pendingResponse, adapterConfig);
            }

            const requestPromise = Promise.resolve(defaultAdapter(adapterConfig))
                .then((response) => {
                    const cacheableResponse = cloneCachedResponse(response, adapterConfig);
                    getResponseCache.set(cacheKey, cacheableResponse);
                    trimGetResponseCache();
                    return cacheableResponse;
                })
                .finally(() => {
                    pendingGetRequests.delete(cacheKey);
                });

            pendingGetRequests.set(cacheKey, requestPromise);
            const response = await requestPromise;
            return cloneCachedResponse(response, adapterConfig);
        };

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for API calls
api.interceptors.response.use(
    async (response) => {
        try {
            const method = (response.config?.method || 'get').toLowerCase();
            const language = response.config?.metadataLanguage || response.config?.headers?.[LANGUAGE_HEADER] || 'en';
            const shouldTranslate = method === 'get'
                && !String(response.config?.url || '').includes('/translate')
                && response.headers?.['x-response-translated'] !== '1'
                && response.config?.headers?.['X-Skip-Auto-Translate'] !== '1';

            if (shouldTranslate) {
                response.data = await translateApiData(response.data, language);
            }
        } catch (translationError) {
            console.error('Auto-translation failed:', translationError);
        }

        return response;
    },
    (error) => {
        const cacheKey = error.config?.metadataCacheKey;
        if (cacheKey) {
            pendingGetRequests.delete(cacheKey);
            getResponseCache.delete(cacheKey);
        }

        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('samir_portfolio_token');
            if (window.location.pathname !== '/admin') {
                alert('Session expired or invalid. Please log in again.');
                window.location.href = '/admin';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
