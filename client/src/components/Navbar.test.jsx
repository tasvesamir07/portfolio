import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../i18n/I18nContext';
import Navbar from './Navbar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../api';

// Mock the API client
vi.mock('../api', () => ({
    default: {
        get: vi.fn().mockResolvedValue({
            data: {
                about: {
                    name: 'Samir',
                    site_name: 'Samir Portfolio',
                    resume_url: '/resume.pdf',
                    custom_nav: []
                },
                pages: []
            }
        })
    }
}));

describe('Navbar Component', () => {
    it('renders navbar correctly with brand name and links', async () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <I18nProvider>
                        <Navbar />
                    </I18nProvider>
                </MemoryRouter>
            </QueryClientProvider>
        );

        // Verify the API is called with consolidated parameters
        expect(api.get).toHaveBeenCalledWith('/page-data?resources=about,pages,social-links');

        // Brand site name or owner name should appear
        await waitFor(() => {
            expect(screen.getByText(/Samir/i)).toBeInTheDocument();
            expect(screen.getByText(/Portfolio/i)).toBeInTheDocument();
        });

        // Common links like "Publications" or "Blog" should appear
        await waitFor(() => {
            expect(screen.getByText('Publications')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('Blog')).toBeInTheDocument();
        });
    });
});
