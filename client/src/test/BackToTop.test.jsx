import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BackToTop from '../components/BackToTop';
import { useReducedMotion } from '../hooks/useReducedMotion';

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

// Mock the useReducedMotion hook
vi.mock('../hooks/useReducedMotion', () => ({
    useReducedMotion: vi.fn().mockReturnValue(false)
}));

describe('BackToTop Component', () => {
    let scrollYValue = 0;
    let scrollTopValue = 0;

    beforeEach(() => {
        vi.clearAllMocks();
        window.scrollTo = vi.fn();
        
        scrollYValue = 0;
        scrollTopValue = 0;

        Object.defineProperty(window, 'scrollY', {
            get() { return scrollYValue; },
            set(val) { scrollYValue = val; },
            configurable: true
        });
        
        Object.defineProperty(document.documentElement, 'scrollTop', {
            get() { return scrollTopValue; },
            set(val) { scrollTopValue = val; },
            configurable: true
        });
    });

    it('should not render button initially', () => {
        render(<BackToTop />);
        expect(screen.queryByRole('button', { name: /scroll to top/i })).not.toBeInTheDocument();
    });

    it('should show button when window scroll is > 200', () => {
        render(<BackToTop />);

        // Simulate scrolling
        scrollYValue = 250;
        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });

        const button = screen.getByRole('button', { name: /scroll to top/i });
        expect(button).toBeInTheDocument();
    });

    it('should hide button when window scroll goes <= 200', () => {
        render(<BackToTop />);

        // Scroll down
        scrollYValue = 250;
        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });
        expect(screen.getByRole('button', { name: /scroll to top/i })).toBeInTheDocument();

        // Scroll back up
        scrollYValue = 150;
        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });
        expect(screen.queryByRole('button', { name: /scroll to top/i })).not.toBeInTheDocument();
    });

    it('should handle scroll on container elements other than window/document', () => {
        render(<BackToTop />);

        // Simulate scroll on a container element inside the document
        const container = document.createElement('div');
        container.className = 'overflow-y-auto';
        document.body.appendChild(container);
        
        Object.defineProperty(container, 'scrollTop', { value: 300, writable: true, configurable: true });
        
        act(() => {
            container.dispatchEvent(new Event('scroll', { bubbles: true }));
        });

        expect(screen.getByRole('button', { name: /scroll to top/i })).toBeInTheDocument();
        
        document.body.removeChild(container);
    });

    it('should scroll window to top and scroll other containers on click', () => {
        // Mock document.querySelectorAll to return mock scrollable containers
        const mockContainer = {
            scrollTo: vi.fn()
        };
        const querySelectorAllMock = vi.spyOn(document, 'querySelectorAll').mockReturnValue([mockContainer]);

        render(<BackToTop />);
        scrollYValue = 250;
        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });

        const button = screen.getByRole('button', { name: /scroll to top/i });
        fireEvent.click(button);

        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
        expect(mockContainer.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

        querySelectorAllMock.mockRestore();
    });

    it('should render with different motion settings if reduced motion is preferred', () => {
        vi.mocked(useReducedMotion).mockReturnValue(true);
        render(<BackToTop />);

        scrollYValue = 250;
        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });

        const button = screen.getByRole('button', { name: /scroll to top/i });
        expect(button).toBeInTheDocument();
    });
});
