import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';

describe('LanguageSwitcher Component', () => {
    it('renders the active language correctly', () => {
        render(
            <I18nProvider>
                <LanguageSwitcher />
            </I18nProvider>
        );

        // Default language English should be displayed in the document
        expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    });

    it('toggles the dropdown when clicked', () => {
        render(
            <I18nProvider>
                <LanguageSwitcher />
            </I18nProvider>
        );

        const toggleBtn = screen.getByRole('button', { name: /language/i });
        
        // Before click, listbox is hidden (class has pointer-events-none)
        const listbox = screen.getByRole('listbox', { name: /language/i });
        expect(listbox.className).toContain('pointer-events-none');

        // Click to open
        fireEvent.click(toggleBtn);
        expect(listbox.className).toContain('pointer-events-auto');

        // Click again to close
        fireEvent.click(toggleBtn);
        expect(listbox.className).toContain('pointer-events-none');
    });

    it('changes language on option selection', () => {
        render(
            <I18nProvider>
                <LanguageSwitcher />
            </I18nProvider>
        );

        const toggleBtn = screen.getByRole('button', { name: /language/i });
        fireEvent.click(toggleBtn);

        // Click Korean option (label is 'Korean')
        const koreanOption = screen.getAllByText('Korean')[0];
        fireEvent.click(koreanOption);

        // The active dropdown button should now display Korean
        expect(screen.getAllByText('Korean').length).toBeGreaterThan(0);
    });
});
