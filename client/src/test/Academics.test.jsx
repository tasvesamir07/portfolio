import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Academics from '../components/Academics';
import api from '../api';
import { I18nProvider } from '../i18n/I18nContext';

vi.mock('../api', () => ({
    default: {
        get: vi.fn()
    }
}));

vi.mock('../hooks/useReducedMotion', () => ({
    useReducedMotion: () => false
}));

// Mock framer-motion to render elements synchronously
vi.mock('framer-motion', () => {
    const motionProxy = new Proxy(
        {},
        {
            get: (target, prop) => {
                return ({ children, ...props }) => {
                    const validProps = {};
                    for (const key in props) {
                        if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileInView', 'viewport'].includes(key)) {
                            validProps[key] = props[key];
                        }
                    }
                    return React.createElement(prop, validProps, children);
                };
            }
        }
    );
    return {
        motion: motionProxy,
        AnimatePresence: ({ children }) => <>{children}</>
    };
});

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    });
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>
            <I18nProvider>
                {children}
            </I18nProvider>
        </QueryClientProvider>
    );
};

describe('Academics Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders skeleton during loading state', () => {
        api.get.mockReturnValue(new Promise(() => {})); // hang requests

        const { container } = render(<Academics />, { wrapper: createWrapper() });
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders empty message when no academics entries exist', async () => {
        api.get.mockResolvedValueOnce({ data: [] });

        render(<Academics />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Academic')).toBeInTheDocument();
            expect(screen.getByText(/no data/i)).toBeInTheDocument();
        });
    });

    it('renders academics list correctly and handles logo error fallback', async () => {
        const mockData = [
            {
                id: 'acad-1',
                degree: 'Bachelor of Science',
                institution: 'State University',
                start_year: '2018',
                end_year: '2022',
                logo_url: 'http://test.com/logo.png',
                details_json: ''
            }
        ];
        api.get.mockResolvedValueOnce({ data: mockData });

        render(<Academics />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Bachelor of Science')).toBeInTheDocument();
            expect(screen.getByText('State University')).toBeInTheDocument();
            expect(screen.getByText('2018 - 2022')).toBeInTheDocument();
            expect(screen.getByAltText('State University')).toBeInTheDocument();
        });

        // Verify fallback icon is NOT in the document initially
        expect(document.querySelector('.lucide-graduation-cap')).not.toBeInTheDocument();

        // Simulate logo load error
        const img = screen.getByAltText('State University');
        act(() => {
            fireEvent.error(img);
        });

        // The image is removed and the GraduationCap icon should appear
        await waitFor(() => {
            expect(screen.queryByAltText('State University')).not.toBeInTheDocument();
            expect(document.querySelector('.lucide-graduation-cap')).toBeInTheDocument();
        });
    });

    it('creates fallback details items when details_json is empty', async () => {
        const mockData = [
            {
                id: 'acad-2',
                degree: 'Master of Science',
                institution: 'Tech Institute',
                start_year: '2022',
                end_year: '2024',
                logo_url: '',
                details_json: ''
            }
        ];
        api.get.mockResolvedValueOnce({ data: mockData });

        render(<Academics />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Master of Science')).toBeInTheDocument();
            // Since end_year is 2024, it should render passing year details item
            // label: t('academics.passingYear') -> which translates to 'academics.passingYear' in test provider
            expect(screen.getByText('Passing Year:')).toBeInTheDocument();
            expect(screen.getByText('2024')).toBeInTheDocument();
            // Since institutionText !== degree and no matching text, it renders institution details item
            expect(screen.getByText('Tech Institute')).toBeInTheDocument();
        });
    });

    it('renders structured details from details_json properly', async () => {
        const structuredDetails = [
            { id: 'det-1', type: 'pair', title: 'Major', values: ['Computer Science'] },
            { id: 'det-2', type: 'text', text: 'GPA: 4.0' }
        ];
        const mockData = [
            {
                id: 'acad-3',
                degree: 'Doctor of Philosophy',
                institution: 'Research Lab',
                start_year: '2024',
                end_year: '',
                logo_url: '',
                details_json: JSON.stringify(structuredDetails)
            }
        ];
        api.get.mockResolvedValueOnce({ data: mockData });

        render(<Academics />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Doctor of Philosophy')).toBeInTheDocument();
            expect(screen.getByText('Major:')).toBeInTheDocument();
            expect(screen.getByText('Computer Science')).toBeInTheDocument();
            expect(screen.getByText('GPA: 4.0')).toBeInTheDocument();
        });
    });
});
