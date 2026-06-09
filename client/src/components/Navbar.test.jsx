import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../i18n/I18nContext';
import Navbar from './Navbar';
import { ThemeProvider } from '../context/ThemeContext';
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
        render(
            <MemoryRouter>
                <I18nProvider>
                    <ThemeProvider>
                        <Navbar />
                    </ThemeProvider>
                </I18nProvider>
            </MemoryRouter>
        );

        // Verify the API is called
        expect(api.get).toHaveBeenCalledWith('/page-data?resources=about,pages');

        // Brand site name or owner name should appear
        await waitFor(() => {
            expect(screen.getByText(/Samir/i)).toBeInTheDocument();
            expect(screen.getByText(/Portfolio/i)).toBeInTheDocument();
        });

        // Common links like "Research" or "Publications" should appear
        expect(screen.getByText('Research')).toBeInTheDocument();
        expect(screen.getByText('Publications')).toBeInTheDocument();
    });
});
