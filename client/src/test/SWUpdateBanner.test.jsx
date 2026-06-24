import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SWUpdateBanner from '../components/SWUpdateBanner';

describe('SWUpdateBanner Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not render when no update is available', () => {
        const { container } = render(<SWUpdateBanner />);
        expect(container.firstChild).toBeNull();
    });

    it('renders and becomes visible when sw:update-available event is dispatched', () => {
        render(<SWUpdateBanner />);

        act(() => {
            const event = new CustomEvent('sw:update-available', {
                detail: { waiting: { postMessage: vi.fn() } }
            });
            window.dispatchEvent(event);
        });

        expect(screen.getByText('Update Available')).toBeInTheDocument();
    });

    it('does not become visible if event has no detail', () => {
        render(<SWUpdateBanner />);

        act(() => {
            const event = new CustomEvent('sw:update-available', { detail: null });
            window.dispatchEvent(event);
        });

        expect(screen.queryByText('Update Available')).not.toBeInTheDocument();
    });

    it('handles Refresh click by posting skip waiting message', () => {
        render(<SWUpdateBanner />);
        const postMessageMock = vi.fn();

        act(() => {
            const event = new CustomEvent('sw:update-available', {
                detail: { waiting: { postMessage: postMessageMock } }
            });
            window.dispatchEvent(event);
        });

        const refreshBtn = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshBtn);

        expect(postMessageMock).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
        expect(screen.queryByText('Update Available')).not.toBeInTheDocument();
    });

    it('handles Dismiss click by hiding the banner', () => {
        render(<SWUpdateBanner />);

        act(() => {
            const event = new CustomEvent('sw:update-available', {
                detail: { waiting: { postMessage: vi.fn() } }
            });
            window.dispatchEvent(event);
        });

        const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
        fireEvent.click(dismissBtn);

        expect(screen.queryByText('Update Available')).not.toBeInTheDocument();
    });

    it('handles close icon click by hiding the banner', () => {
        const { container } = render(<SWUpdateBanner />);

        act(() => {
            const event = new CustomEvent('sw:update-available', {
                detail: { waiting: { postMessage: vi.fn() } }
            });
            window.dispatchEvent(event);
        });

        // The close button is the one with the X icon which has SVG inside.
        // We can query by selector or find the button by its role/aria-label or just button elements.
        // The banner has three buttons: Refresh, Dismiss, and X.
        const buttons = screen.getAllByRole('button');
        const closeBtn = buttons[2]; // the third button is the X button
        
        fireEvent.click(closeBtn);

        expect(screen.queryByText('Update Available')).not.toBeInTheDocument();
    });
});
