import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';
import { usePublicPageData } from '../hooks/useSiteName';

vi.mock('../i18n/I18nContext', () => ({
    useI18n: () => ({
        t: (key, options) => {
            if (key === 'footer.copyright') {
                return `© ${options?.year || 2026} Samir. All rights reserved.`;
            }
            return key;
        }
    })
}));

vi.mock('../hooks/useSiteName', () => ({
    usePublicPageData: vi.fn()
}));

describe('Footer Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders socialLinks correctly', () => {
        vi.mocked(usePublicPageData).mockReturnValue({
            data: {
                socialLinks: [
                    { platform: 'GitHub', url: 'https://github.com' }
                ]
            }
        });

        render(<Footer />);
        expect(screen.getByTitle('GitHub')).toBeInTheDocument();
    });

    it('renders social-links key correctly', () => {
        vi.mocked(usePublicPageData).mockReturnValue({
            data: {
                'social-links': [
                    { id: '2', platform: 'LinkedIn', url: 'https://linkedin.com', icon_name: 'Linkedin' }
                ]
            }
        });

        render(<Footer />);
        expect(screen.getByTitle('LinkedIn')).toBeInTheDocument();
    });

    it('renders social_links key correctly', () => {
        vi.mocked(usePublicPageData).mockReturnValue({
            data: {
                social_links: [
                    { id: '3', platform: 'Twitter', url: 'https://twitter.com', icon_name: 'Twitter' }
                ]
            }
        });

        render(<Footer />);
        expect(screen.getByTitle('Twitter')).toBeInTheDocument();
    });

    it('handles empty data / missing social links gracefully', () => {
        vi.mocked(usePublicPageData).mockReturnValue({
            data: {}
        });

        const { container } = render(<Footer />);
        expect(container.querySelector('footer')).toBeInTheDocument();
        expect(screen.getByText('footer.developedWithPassion')).toBeInTheDocument();
    });

    it('handles null data gracefully', () => {
        vi.mocked(usePublicPageData).mockReturnValue({
            data: null
        });

        const { container } = render(<Footer />);
        expect(container.querySelector('footer')).toBeInTheDocument();
    });
});
