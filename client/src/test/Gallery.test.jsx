import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Gallery from '../components/Gallery';
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

describe('Gallery Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders skeleton when loading', () => {
        api.get.mockReturnValue(new Promise(() => {})); // hang requests

        const { container } = render(<Gallery />, { wrapper: createWrapper() });
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders empty section if no visible images', async () => {
        api.get.mockImplementation((url) => {
            if (url === '/gallery') return Promise.resolve({ data: [] });
            if (url === '/gallery-categories') return Promise.resolve({ data: [] });
            return Promise.reject(new Error('not found'));
        });

        render(<Gallery />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByText('Visual')).toBeInTheDocument();
            expect(screen.getByText(/no data/i)).toBeInTheDocument();
        });
    });

    it('renders categories and images, and filters results on click', async () => {
        const mockCategories = [
            { id: 'cat-1', name: 'Nature' },
            { id: 'cat-2', name: 'Tech' }
        ];
        const mockImages = [
            { id: 'img-1', category: 'Nature', image_url: 'http://test.com/n1.jpg', caption: 'Nature One' },
            { id: 'img-2', category: 'Tech', image_url: 'http://test.com/t1.jpg', caption: 'Tech One' }
        ];

        api.get.mockImplementation((url) => {
            if (url === '/gallery') return Promise.resolve({ data: mockImages });
            if (url === '/gallery-categories') return Promise.resolve({ data: mockCategories });
            return Promise.reject(new Error('not found'));
        });

        render(<Gallery />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByAltText('Nature One')).toBeInTheDocument();
            expect(screen.getByAltText('Tech One')).toBeInTheDocument();
        });

        const techBtn = screen.getByRole('button', { name: 'Tech' });
        act(() => {
            fireEvent.click(techBtn);
        });

        await waitFor(() => {
            expect(screen.queryByAltText('Nature One')).not.toBeInTheDocument();
            expect(screen.getByAltText('Tech One')).toBeInTheDocument();
        });

        const allBtn = screen.getByRole('button', { name: /all/i });
        act(() => {
            fireEvent.click(allBtn);
        });

        await waitFor(() => {
            expect(screen.getByAltText('Nature One')).toBeInTheDocument();
            expect(screen.getByAltText('Tech One')).toBeInTheDocument();
        });
    });

    it('handles image error by hiding the image and closing lightbox if selected', async () => {
        const mockCategories = [{ id: 'cat-1', name: 'Nature' }];
        const mockImages = [
            { id: 'img-1', category: 'Nature', image_url: 'http://test.com/n1.jpg', caption: 'Nature One' }
        ];

        api.get.mockImplementation((url) => {
            if (url === '/gallery') return Promise.resolve({ data: mockImages });
            if (url === '/gallery-categories') return Promise.resolve({ data: mockCategories });
            return Promise.reject(new Error('not found'));
        });

        render(<Gallery />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByAltText('Nature One')).toBeInTheDocument();
        });

        // Open lightbox first by clicking card
        const imgEl = screen.getByAltText('Nature One');
        act(() => {
            fireEvent.click(imgEl.closest('.group'));
        });
        
        await waitFor(() => {
            expect(document.querySelector('.fixed.inset-0')).toBeInTheDocument();
        });

        // Simulate image load error on gallery card image (uniquely queried by selecting from .group)
        const activeImgEl = document.querySelector('.group img');
        act(() => {
            fireEvent.error(activeImgEl);
        });

        // Image should be removed, leaving empty gallery screen and lightbox closed
        await waitFor(() => {
            expect(screen.queryByAltText('Nature One')).not.toBeInTheDocument();
            expect(document.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
        });
    });

    it('opens and closes lightbox correctly', async () => {
        const mockCategories = [{ id: 'cat-1', name: 'Nature' }];
        const mockImages = [
            { id: 'img-1', category: 'Nature', image_url: 'http://test.com/n1.jpg', caption: 'Nature One' }
        ];

        api.get.mockImplementation((url) => {
            if (url === '/gallery') return Promise.resolve({ data: mockImages });
            if (url === '/gallery-categories') return Promise.resolve({ data: mockCategories });
            return Promise.reject(new Error('not found'));
        });

        render(<Gallery />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByAltText('Nature One')).toBeInTheDocument();
        });

        // Click to open lightbox
        act(() => {
            const card = screen.getByAltText('Nature One').closest('.group');
            fireEvent.click(card);
        });

        await waitFor(() => {
            expect(document.querySelector('.fixed.inset-0')).toBeInTheDocument();
        });

        // Click close button inside lightbox
        act(() => {
            const lightbox = document.querySelector('.fixed.inset-0');
            const closeBtn = lightbox.querySelector('button');
            fireEvent.click(closeBtn);
        });

        await waitFor(() => {
            expect(document.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
        });

        // Click to open again (re-query card to avoid detached node issues)
        act(() => {
            const cardRequeried = screen.getByAltText('Nature One').closest('.group');
            fireEvent.click(cardRequeried);
        });

        await waitFor(() => {
            expect(document.querySelector('.fixed.inset-0')).toBeInTheDocument();
        });

        // Click on backdrop to close
        act(() => {
            const lightboxNew = document.querySelector('.fixed.inset-0');
            fireEvent.click(lightboxNew);
        });

        await waitFor(() => {
            expect(document.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
        });
    });

    it('lightbox does not close when clicking inside the lightbox modal content', async () => {
        const mockCategories = [{ id: 'cat-1', name: 'Nature' }];
        const mockImages = [
            { id: 'img-1', category: 'Nature', image_url: 'http://test.com/n1.jpg', caption: 'Nature One' }
        ];

        api.get.mockImplementation((url) => {
            if (url === '/gallery') return Promise.resolve({ data: mockImages });
            if (url === '/gallery-categories') return Promise.resolve({ data: mockCategories });
            return Promise.reject(new Error('not found'));
        });

        render(<Gallery />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByAltText('Nature One')).toBeInTheDocument();
        });

        // Click to open
        act(() => {
            fireEvent.click(screen.getByAltText('Nature One').closest('.group'));
        });

        await waitFor(() => {
            expect(document.querySelector('.fixed.inset-0')).toBeInTheDocument();
        });

        // Click inside the modal content (re-queried)
        act(() => {
            const innerContent = document.querySelector('.fixed.inset-0 div.relative');
            fireEvent.click(innerContent);
        });

        // Lightbox should still be open
        expect(document.querySelector('.fixed.inset-0')).toBeInTheDocument();
    });

    it('closes lightbox when selected image fails to load in lightbox', async () => {
        const mockCategories = [{ id: 'cat-1', name: 'Nature' }];
        const mockImages = [
            { id: 'img-1', category: 'Nature', image_url: 'http://test.com/n1.jpg', caption: 'Nature One' }
        ];

        api.get.mockImplementation((url) => {
            if (url === '/gallery') return Promise.resolve({ data: mockImages });
            if (url === '/gallery-categories') return Promise.resolve({ data: mockCategories });
            return Promise.reject(new Error('not found'));
        });

        render(<Gallery />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByAltText('Nature One')).toBeInTheDocument();
        });

        // Open lightbox
        act(() => {
            fireEvent.click(screen.getByAltText('Nature One').closest('.group'));
        });

        await waitFor(() => {
            expect(document.querySelector('.fixed.inset-0 img')).toBeInTheDocument();
        });

        // Trigger onError on lightbox image (re-queried)
        act(() => {
            const lightboxImg = document.querySelector('.fixed.inset-0 img');
            fireEvent.error(lightboxImg);
        });

        // Lightbox should close
        await waitFor(() => {
            expect(document.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
        });
    });
});
