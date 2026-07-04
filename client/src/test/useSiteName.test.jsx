import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '../i18n/I18nContext';
import { useSiteName, useSiteIdentity, usePublicPageData } from '../hooks/useSiteName';
import api from '../api';

vi.mock('../api', () => ({
    default: {
        get: vi.fn()
    }
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>
            <I18nProvider>
                {children}
            </I18nProvider>
        </QueryClientProvider>
    );
};

describe('useSiteName and useSiteIdentity Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should query public page data with query client', async () => {
        const mockData = {
            about: {
                name: 'Samir <b>Tasve</b>',
                site_name: 'My <i>Portfolio</i>',
                sub_bio: 'A short bio&nbsp;here',
                logo_url: 'https://logo.png',
                name: 'Samir &amp; team'
            }
        };
        api.get.mockResolvedValueOnce({ data: mockData });

        const { result } = renderHook(() => usePublicPageData(), {
            wrapper: createWrapper()
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(api.get).toHaveBeenCalledWith('/page-data?resources=about,pages,social-links');
        expect(result.current.data).toEqual(mockData);
    });

    it('should return site name and strip html correctly', async () => {
        const mockData = {
            about: {
                name: 'Samir <b>Tasve</b>',
                site_name: 'My <i>Portfolio</i>'
            }
        };
        api.get.mockResolvedValue({ data: mockData });

        const { result } = renderHook(() => useSiteName(), {
            wrapper: createWrapper()
        });

        await waitFor(() => expect(result.current).not.toBe('Portfolio'));
        // name has precedence over site_name in useSiteName hook: stripHtml(about?.name || about?.site_name || 'Portfolio')
        expect(result.current).toBe('Samir Tasve');
    });

    it('should return fallback site name when about is not loaded', async () => {
        api.get.mockResolvedValueOnce({ data: null });

        const { result } = renderHook(() => useSiteName(), {
            wrapper: createWrapper()
        });

        await waitFor(() => expect(result.current).toBe('Portfolio'));
    });

    it('should parse and return full site identity correctly with stripHtml', async () => {
        const mockData = {
            about: {
                name: 'Samir <b>Tasve</b>',
                site_name: 'My <i>Portfolio</i>',
                sub_bio: 'A short bio&nbsp;here',
                logo_url: 'https://logo.png',
                name: 'Samir'
            }
        };
        api.get.mockResolvedValue({ data: mockData });

        const { result } = renderHook(() => useSiteIdentity(), {
            wrapper: createWrapper()
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.name).toBe('Samir Tasve');
        expect(result.current.siteName).toBe('My Portfolio');
        expect(result.current.description).toBe('A short bio here');
        expect(result.current.logoUrl).toBe('https://logo.png');
        expect(result.current.authorNames).toBe('Samir Tasve');
    });

    it('should provide default fallbacks for useSiteIdentity when about fields are missing', async () => {
        api.get.mockResolvedValueOnce({ data: { about: {} } });

        const { result } = renderHook(() => useSiteIdentity(), {
            wrapper: createWrapper()
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.name).toBe('Portfolio');
        expect(result.current.siteName).toBe('Portfolio');
        expect(result.current.description).toBe('');
        expect(result.current.logoUrl).toBe('');
        expect(result.current.authorNames).toBe('Portfolio');
    });
});
