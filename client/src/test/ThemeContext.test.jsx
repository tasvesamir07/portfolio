import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

const TestComponent = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <div>
            <span data-testid="theme-val">{theme}</span>
            <button onClick={toggleTheme}>Toggle</button>
        </div>
    );
};

const BadComponent = () => {
    useTheme();
    return <div>Bad</div>;
};

describe('ThemeContext', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('should initialize with light mode by default', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        expect(screen.getByTestId('theme-val').textContent).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should initialize from localStorage if present', () => {
        localStorage.setItem('portfolio-theme', 'dark');
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        expect(screen.getByTestId('theme-val').textContent).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should initialize based on prefers-color-scheme if matches', () => {
        // Mock matchMedia
        const matchMediaMock = vi.fn().mockImplementation(query => ({
            matches: query.includes('dark'),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        vi.stubGlobal('matchMedia', matchMediaMock);

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        expect(screen.getByTestId('theme-val').textContent).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should toggle theme when toggleTheme is called', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );
        expect(screen.getByTestId('theme-val').textContent).toBe('light');

        const button = screen.getByText('Toggle');
        act(() => {
            button.click();
        });

        expect(screen.getByTestId('theme-val').textContent).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('portfolio-theme')).toBe('dark');

        act(() => {
            button.click();
        });

        expect(screen.getByTestId('theme-val').textContent).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('portfolio-theme')).toBe('light');
    });

    it('should throw an error when used outside of ThemeProvider', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<BadComponent />)).toThrow('useTheme must be used within a ThemeProvider');
        consoleError.mockRestore();
    });
});
