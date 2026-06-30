import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Publications from './Publications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../i18n/I18nContext', () => ({
    useI18n: () => ({
        language: 'en',
        t: (key) => key
    })
}));

vi.mock('../hooks/useSiteName', () => ({
    useSiteIdentity: () => ({
        authorNames: 'Samir'
    })
}));

vi.mock('../api', () => ({
    default: {
        get: vi.fn().mockImplementation(() => Promise.resolve({
            data: [
                {
                    id: 1,
                    title: 'Quantum Computing Breakthrough',
                    journal_name: 'Nature Science',
                    authors: 'Samir, John Doe',
                    introduction: '',
                    methods: '',
                    details_json: '[]'
                }
            ]
        }))
    }
}));

describe('Publications Component', () => {
    it('renders publications list correctly', async () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <Publications />
            </QueryClientProvider>
        );

        // Verify elements render after query resolves
        await waitForExpect(() => {
            expect(screen.getByText('Quantum Computing Breakthrough')).toBeInTheDocument();
            expect(screen.getByText('Nature Science')).toBeInTheDocument();
            expect(screen.getByText(/Samir/)).toBeInTheDocument();
        });
    });
});

// Helper for waiting for async queries
async function waitForExpect(fn, timeout = 1000) {
    const start = Date.now();
    while (true) {
        try {
            fn();
            return;
        } catch (err) {
            if (Date.now() - start > timeout) {
                throw err;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
    }
}
