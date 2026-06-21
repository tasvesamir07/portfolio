import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

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
    usePublicPageData: () => ({
        data: {
            socialLinks: [
                { id: '1', platform: 'GitHub', url: 'https://github.com', icon_name: 'Github' },
                { id: '2', platform: 'LinkedIn', url: 'https://linkedin.com', icon_name: 'Linkedin' }
            ]
        }
    })
}));

describe('Footer Component', () => {
    it('renders social media links and translated texts', () => {
        render(<Footer />);

        // Verify social links render correctly
        const githubLink = screen.getByTitle('GitHub');
        const linkedinLink = screen.getByTitle('LinkedIn');

        expect(githubLink).toBeInTheDocument();
        expect(githubLink).toHaveAttribute('href', 'https://github.com');
        expect(linkedinLink).toBeInTheDocument();
        expect(linkedinLink).toHaveAttribute('href', 'https://linkedin.com');

        // Verify texts
        expect(screen.getByText('footer.developedWithPassion')).toBeInTheDocument();
        expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    });
});
