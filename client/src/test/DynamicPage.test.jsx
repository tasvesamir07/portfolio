import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DynamicPage from '../pages/DynamicPage';
import api from '../api';
import { I18nProvider } from '../i18n/I18nContext';

vi.mock('../api', () => ({
    default: {
        get: vi.fn()
    }
}));

// Mock SEO
vi.mock('../hooks/useSeo', () => ({
    default: () => null
}));

// Mock useReducedMotion
vi.mock('../hooks/useReducedMotion', () => ({
    useReducedMotion: () => false
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                retryDelay: 0 // Execute retries instantly
            }
        }
    });
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>
            <I18nProvider>
                <MemoryRouter initialEntries={['/pages/test-slug']}>
                    <Routes>
                        <Route path="/pages/:slug" element={children} />
                    </Routes>
                </MemoryRouter>
            </I18nProvider>
        </QueryClientProvider>
    );
};

describe('DynamicPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default mock for page-data to prevent useSiteName from failing
        api.get.mockImplementation((url) => {
            if (url.includes('page-data')) {
                return Promise.resolve({
                    data: {
                        about: { name: 'Samir', site_name: 'Samir Portfolio' },
                        pages: [],
                        socialLinks: []
                    }
                });
            }
            return new Promise(() => {}); // hang other requests by default
        });
    });

    it('renders loading spinner initially', () => {
        // Leave /page call hanging
        render(<DynamicPage />, { wrapper: createWrapper() });
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('renders error page when api request fails', async () => {
        const error = new Error('Not found');
        error.response = { status: 404 };
        
        api.get.mockImplementation((url) => {
            if (url.includes('page-data')) {
                return Promise.resolve({
                    data: { about: { name: 'Samir' } }
                });
            }
            return Promise.reject(error);
        });

        render(<DynamicPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('404')).toBeInTheDocument();
            expect(screen.getByText(/The page you're looking for doesn't exist/i)).toBeInTheDocument();
        });
    });

    it('renders content of page on success', async () => {
        const pageData = {
            title: 'Sample Title',
            content: '<p>Sample page content body</p>',
            details_json: null
        };
        
        api.get.mockImplementation((url) => {
            if (url.includes('page-data')) {
                return Promise.resolve({
                    data: { about: { name: 'Samir' } }
                });
            }
            if (url === '/page') {
                return Promise.resolve({ data: pageData });
            }
            return Promise.reject(new Error('Unexpected call'));
        });

        render(<DynamicPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Sample Title')).toBeInTheDocument();
            expect(screen.getByText('Sample page content body')).toBeInTheDocument();
        });
    });

    it('falls back to /pages/:slug when /page api fails with 404', async () => {
        const error = new Error('Not found');
        error.response = { status: 404 };
        
        const pageData = {
            title: 'Fallback Title',
            content: 'Fallback content'
        };

        api.get.mockImplementation((url) => {
            if (url.includes('page-data')) {
                return Promise.resolve({
                    data: { about: { name: 'Samir' } }
                });
            }
            if (url === '/page') {
                return Promise.reject(error);
            }
            if (url === '/pages/test-slug') {
                return Promise.resolve({ data: pageData });
            }
            return Promise.reject(new Error('Unexpected call'));
        });

        render(<DynamicPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Fallback Title')).toBeInTheDocument();
        });
    });

    it('re-throws error if primary error is not 400 or 404', async () => {
        const error = new Error('Internal Server Error');
        error.response = { status: 500 };
        
        let pageCallCount = 0;

        api.get.mockImplementation((url) => {
            if (url.includes('page-data')) {
                return Promise.resolve({
                    data: { about: { name: 'Samir' } }
                });
            }
            if (url === '/page') {
                pageCallCount++;
                return Promise.reject(error);
            }
            return Promise.reject(new Error('Unexpected call'));
        });

        render(<DynamicPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('404')).toBeInTheDocument();
        });
        expect(pageCallCount).toBeGreaterThanOrEqual(1);
    });

    it('renders structured details when details_json is present', async () => {
        const pageData = {
            title: 'Structured Title',
            content: '',
            details_json: JSON.stringify([{ id: '1', type: 'text', title: 'Subtitle', text: 'Detail Text' }])
        };
        
        api.get.mockImplementation((url) => {
            if (url.includes('page-data')) {
                return Promise.resolve({
                    data: { about: { name: 'Samir' } }
                });
            }
            if (url === '/page') {
                return Promise.resolve({ data: pageData });
            }
            return Promise.reject(new Error('Unexpected call'));
        });

        render(<DynamicPage />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Structured Title')).toBeInTheDocument();
            expect(screen.getByText('Detail Text')).toBeInTheDocument();
        });
    });
});
