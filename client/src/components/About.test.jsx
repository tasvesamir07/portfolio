import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import About from './About';

vi.mock('../i18n/I18nContext', () => ({
    useI18n: () => ({
        language: 'en',
        t: (key) => key
    })
}));

vi.mock('../i18n/localize', () => ({
    getLocalizedField: (data, field, lang, fallback) => fallback
}));

describe('About Component', () => {
    const mockData = {
        name: 'Samir',
        hero_image_url: 'https://example.com/hero.jpg',
        sub_bio: JSON.stringify([
            { type: 'pair', title: 'Location', values: ['Dhaka, Bangladesh'] },
            { type: 'text', text: 'Researcher at Lab X' }
        ]),
        bio_text: 'Hello. I do research.\n\nParagraph 2.',
        resume_url: 'https://example.com/resume.pdf'
    };

    it('renders About component fields correctly', () => {
        render(<About data={mockData} />);

        // Verify name is rendered as alt text or present in title
        expect(screen.getByAltText('Samir')).toBeInTheDocument();

        // Verify sub_bio details (location highlight pair)
        expect(screen.getByText('Location:')).toBeInTheDocument();
        expect(screen.getByText('Dhaka, Bangladesh')).toBeInTheDocument();

        // Verify bio paragraphs
        expect(screen.getByText('Hello. I do research.')).toBeInTheDocument();
        expect(screen.getByText('Paragraph 2.')).toBeInTheDocument();

        // Verify CV download button
        const cvBtn = screen.getByRole('link', { name: 'about.downloadFullCv' });
        expect(cvBtn).toBeInTheDocument();
        expect(cvBtn).toHaveAttribute('href', 'https://example.com/resume.pdf');
    });

    it('returns null if data is not provided', () => {
        const { container } = render(<About data={null} />);
        expect(container.firstChild).toBeNull();
    });
});
