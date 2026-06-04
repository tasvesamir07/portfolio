import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

vi.mock('../context/ThemeContext', () => ({
    useTheme: vi.fn()
}));

describe('ThemeToggle Component', () => {
    it('renders with dark mode state', () => {
        useTheme.mockReturnValue({
            theme: 'dark',
            toggleTheme: vi.fn()
        });

        render(<ThemeToggle />);
        expect(screen.getByTitle('Switch to Light Mode')).toBeInTheDocument();
    });

    it('toggles theme on click', () => {
        const toggleThemeMock = vi.fn();
        useTheme.mockReturnValue({
            theme: 'light',
            toggleTheme: toggleThemeMock
        });

        render(<ThemeToggle />);
        const button = screen.getByTitle('Switch to Dark Mode');
        fireEvent.click(button);
        expect(toggleThemeMock).toHaveBeenCalledTimes(1);
    });
});
