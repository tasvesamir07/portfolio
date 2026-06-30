import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { expireSessionAndRedirect, getStoredToken } from './utils/authSession';

const STORAGE_KEY = 'portfolio-language';
const LANGUAGE_HEADER = 'X-Translate-Language';
const MAX_CACHED_GETS = 120;
const API_RESPONSE_CACHE_VERSION = 'v6';

interface CachedResponse {
  data: unknown;
  status?: number;
  statusText?: string;
  headers: Record<string, unknown>;
  config?: InternalAxiosRequestConfig;
  _fromCache?: boolean;
}

const getResponseCache = new Map<string, CachedResponse>();
const pendingGetRequests = new Map<string, Promise<AxiosResponse>>();

const cloneData = <T>(value: T): T => {
  if (value == null) return value;
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const trimGetResponseCache = (): void => {
  if (getResponseCache.size <= MAX_CACHED_GETS) return;
  const oldestKey = getResponseCache.keys().next().value;
  if (oldestKey) {
    getResponseCache.delete(oldestKey);
  }
};

const buildGetCacheKey = (config: InternalAxiosRequestConfig, language: string): string => {
  const baseUrl = config.baseURL || '';
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${API_RESPONSE_CACHE_VERSION}::${language}::${baseUrl}::${url}::${params}`;
};

const resolveAdapter = (adapter: unknown): InternalAxiosRequestConfig['adapter'] | undefined => {
  if (typeof adapter === 'function') {
    return adapter as InternalAxiosRequestConfig['adapter'];
  }
  if (typeof axios.getAdapter === 'function') {
    return axios.getAdapter(api.defaults.adapter) as InternalAxiosRequestConfig['adapter'];
  }
  return api.defaults.adapter;
};

const cloneCachedResponse = (response: AxiosResponse | CachedResponse, config: InternalAxiosRequestConfig): CachedResponse => ({
  ...response,
  data: cloneData(response.data),
  headers: response.headers ? { ...response.headers } as unknown as Record<string, unknown> : {},
  config: config
});

let defaultBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

if (defaultBaseUrl && !defaultBaseUrl.endsWith('/api/v1') && !defaultBaseUrl.endsWith('/api/v1/')) {
  if (defaultBaseUrl.endsWith('/api') || defaultBaseUrl.endsWith('/api/')) {
    defaultBaseUrl = defaultBaseUrl.replace(/\/$/, '') + '/v1';
  } else {
    defaultBaseUrl = defaultBaseUrl.replace(/\/$/, '') + '/api/v1';
  }
}

const resolveRuntimeApiBaseUrl = (configuredBaseUrl: string): string => {
  if (typeof window === 'undefined') return configuredBaseUrl;

  try {
    const configuredUrl = new URL(configuredBaseUrl, window.location.origin);
    const currentHost = window.location.hostname;
    const configuredHost = configuredUrl.hostname;
    const isLocalhost = ['localhost', '127.0.0.1'].includes(currentHost);
    const isCrossOriginTarget = !isLocalhost && configuredHost !== null && configuredHost !== currentHost;

    if (isCrossOriginTarget) {
      return '/api/v1';
    }
  } catch {
    // Fall back to the configured value when it cannot be parsed.
  }

  return configuredBaseUrl;
};

defaultBaseUrl = resolveRuntimeApiBaseUrl(defaultBaseUrl);

interface ApiConfig extends InternalAxiosRequestConfig {
  enableAutoTranslate?: boolean;
  metadataLanguage?: string;
  metadataCacheKey?: string;
}

const api: AxiosInstance & { _lastCachedLanguage?: string } = axios.create({
  baseURL: defaultBaseUrl,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
});

export const clearResponseCache = (): void => {
  getResponseCache.clear();
  pendingGetRequests.clear();
};

if (typeof window !== 'undefined') {
  window.addEventListener('portfolio:languageChange', () => {
    clearResponseCache();
  });
}

api.interceptors.request.use(
  (config: ApiConfig) => {
    const token = getStoredToken();
    const requestLanguage = localStorage.getItem(STORAGE_KEY) || 'en';
    const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    const method = String(config.method || 'get').toLowerCase();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const autoTranslateEnabled = method === 'get'
      && !isAdminRoute
      && !String(config.url || '').includes('/translate')
      && config.enableAutoTranslate !== false;

    config.enableAutoTranslate = autoTranslateEnabled;
    config.headers[LANGUAGE_HEADER] = requestLanguage;
    if (!autoTranslateEnabled) {
      config.headers['X-Skip-Auto-Translate'] = '1';
    }
    config.metadataLanguage = requestLanguage;

    if (api._lastCachedLanguage && api._lastCachedLanguage !== requestLanguage) {
      getResponseCache.clear();
      pendingGetRequests.clear();
    }
    api._lastCachedLanguage = requestLanguage;

    const isCacheableGet = method === 'get'
      && !isAdminRoute
      && !String(config.url || '').includes('/translate');

    if (isCacheableGet) {
      config.params = { ...config.params, lang: requestLanguage };
    }

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
      config.adapter = async () => ({ ...cloneCachedResponse(cachedResponse, config), _fromCache: true }) as AxiosResponse;
      return config;
    }

    const defaultAdapter = resolveAdapter(config.adapter || api.defaults.adapter)!;
    config.adapter = async (adapterConfig: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      if (pendingGetRequests.has(cacheKey)) {
        const pendingResponse = await pendingGetRequests.get(cacheKey)!;
        return cloneCachedResponse(pendingResponse, adapterConfig) as AxiosResponse;
      }

      const requestPromise = Promise.resolve((defaultAdapter as (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>)(adapterConfig))
        .then((response: AxiosResponse) => {
          pendingGetRequests.delete(cacheKey);
          return response;
        });

      pendingGetRequests.set(cacheKey, requestPromise);
      const response = await requestPromise;
      return cloneCachedResponse(response, adapterConfig) as AxiosResponse;
    };

    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  async (response: AxiosResponse & { _fromCache?: boolean }) => {
    try {
      const method = String(response.config?.method || 'get').toLowerCase();
      if (method !== 'get' && method !== 'head' && method !== 'options') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('portfolio:mutation', { detail: { url: response.config?.url } }));
        }
      }

      const fromCache = response._fromCache === true;

      if (!fromCache) {
        const cacheKey = (response.config as ApiConfig)?.metadataCacheKey;
        if (cacheKey) {
          const snapshot = cloneCachedResponse(response, response.config!);
          getResponseCache.set(cacheKey, snapshot);
          trimGetResponseCache();
        }
      }
    } catch (e) {
      console.error('Response caching failed:', e);
    }

    return response;
  },
  (error: { config?: ApiConfig; response?: AxiosResponse }) => {
    const cacheKey = error.config?.metadataCacheKey;
    if (cacheKey) {
      pendingGetRequests.delete(cacheKey);
      getResponseCache.delete(cacheKey);
    }

    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      expireSessionAndRedirect({
        message: 'Session expired or invalid. Please log in again.'
      });
    }
    return Promise.reject(error);
  }
);

export default api;
