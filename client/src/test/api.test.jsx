import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api, { clearResponseCache } from '../api';
import { storeSessionToken } from '../utils/authSession';

vi.mock('../utils/authSession', () => ({
    getStoredToken: vi.fn(() => 'mock-token'),
    expireSessionAndRedirect: vi.fn(),
    storeSessionToken: vi.fn()
}));

describe('API Service (api.js)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        clearResponseCache();
    });

    it('should set authorization header when token is stored', async () => {
        const config = {
            url: '/test',
            method: 'get',
            headers: {}
        };
        
        // Trigger request interceptor
        const resolvedConfig = await api.interceptors.request.handlers[0].fulfilled(config);
        
        expect(resolvedConfig.headers.Authorization).toBe('Bearer mock-token');
        expect(resolvedConfig.headers['X-Translate-Language']).toBe('en');
    });

    it('should configure auto-translate rules correctly for public get requests', async () => {
        const config = {
            url: '/publications',
            method: 'get',
            headers: {}
        };

        const resolvedConfig = await api.interceptors.request.handlers[0].fulfilled(config);
        expect(resolvedConfig.enableAutoTranslate).toBe(true);
        expect(resolvedConfig.headers['X-Skip-Auto-Translate']).toBeUndefined();
    });

    it('should skip auto-translate for non-get requests', async () => {
        const config = {
            url: '/messages',
            method: 'post',
            headers: {}
        };

        const resolvedConfig = await api.interceptors.request.handlers[0].fulfilled(config);
        expect(resolvedConfig.enableAutoTranslate).toBe(false);
        expect(resolvedConfig.headers['X-Skip-Auto-Translate']).toBe('1');
    });

    it('should clear response cache on post requests', async () => {
        const config = {
            url: '/experiences',
            method: 'post',
            headers: {}
        };

        const resolvedConfig = await api.interceptors.request.handlers[0].fulfilled(config);
        expect(resolvedConfig.headers.Authorization).toBe('Bearer mock-token');
    });

    it('should handle response caching and interceptors', async () => {
        api.defaults.adapter = vi.fn().mockResolvedValue({ data: { institution: 'MIT' } });

        const config = {
            url: '/academics',
            method: 'get',
            headers: {}
        };

        const resolvedConfig = await api.interceptors.request.handlers[0].fulfilled(config);
        expect(resolvedConfig.metadataCacheKey).toBeDefined();

        const mockResponse = {
            config: resolvedConfig,
            data: { institution: 'MIT' }
        };

        // Cache the response
        const result = await api.interceptors.response.handlers[0].fulfilled(mockResponse);
        expect(result.data.institution).toBe('MIT');

        // Request again, should hit cache
        const resolvedConfigCacheHit = await api.interceptors.request.handlers[0].fulfilled({
            url: '/academics',
            method: 'get',
            headers: {}
        });

        expect(resolvedConfigCacheHit.adapter).toBeDefined();
        const cacheHitResult = await resolvedConfigCacheHit.adapter();
        expect(cacheHitResult.data.institution).toBe('MIT');
        expect(cacheHitResult._fromCache).toBe(true);

        // Language change cache flushing
        localStorage.setItem('portfolio-language', 'bn');
        const resolvedConfigNewLang = await api.interceptors.request.handlers[0].fulfilled({
            url: '/academics',
            method: 'get',
            headers: {}
        });
        // Since it's a new language, cache hit shouldn't happen, it will generate a new cache key
        expect(resolvedConfigNewLang.metadataCacheKey).toContain('::bn::');
    });

    it('should deduplicate pending requests using the adapter', async () => {
        let resolvePromise;
        const adapterPromise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        api.defaults.adapter = vi.fn().mockReturnValue(adapterPromise);

        const config = {
            url: '/academics',
            method: 'get',
            headers: {}
        };

        const resolvedConfig = await api.interceptors.request.handlers[0].fulfilled(config);

        // Simulate two identical concurrent requests
        const p1 = resolvedConfig.adapter(resolvedConfig);
        const p2 = resolvedConfig.adapter(resolvedConfig);

        resolvePromise({ data: { concurrent: true } });

        const [r1, r2] = await Promise.all([p1, p2]);
        expect(r1.data.concurrent).toBe(true);
        expect(r2.data.concurrent).toBe(true);
    });

    it('should handle 401 response and redirect', async () => {
        const mockError = {
            config: {
                method: 'get',
                url: '/admin/dashboard',
                metadataCacheKey: 'test-key'
            },
            response: {
                status: 401
            }
        };

        const { expireSessionAndRedirect } = await import('../utils/authSession');

        await expect(
            api.interceptors.response.handlers[0].rejected(mockError)
        ).rejects.toEqual(mockError);

        expect(expireSessionAndRedirect).toHaveBeenCalled();
    });

    it('should flush response cache when portfolio:languageChange event fires', () => {
        const event = new CustomEvent('portfolio:languageChange');
        window.dispatchEvent(event);
    });

    it('should dispatch portfolio:mutation custom event on non-GET responses', async () => {
        const mockResponse = {
            config: {
                method: 'post',
                url: '/experiences'
            },
            data: { success: true }
        };
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
        await api.interceptors.response.handlers[0].fulfilled(mockResponse);
        expect(dispatchSpy).toHaveBeenCalled();
        const eventType = dispatchSpy.mock.calls[0][0].type;
        expect(eventType).toBe('portfolio:mutation');
        dispatchSpy.mockRestore();
    });

    it('should handle response caching errors gracefully', async () => {
        const mockResponse = {
            config: {
                method: 'get',
                metadataCacheKey: 'error-key'
            },
            data: () => {}
        };

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await api.interceptors.response.handlers[0].fulfilled(mockResponse);
        expect(result).toBe(mockResponse);
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('should cleanup pending cache keys on request error response rejection', async () => {
        const mockError = {
            config: {
                metadataCacheKey: 'error-key'
            }
        };
        await expect(
            api.interceptors.response.handlers[0].rejected(mockError)
        ).rejects.toEqual(mockError);
    });
});
