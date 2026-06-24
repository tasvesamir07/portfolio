import React, { useRef, useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import useFocusTrap from '../hooks/useFocusTrap';

const TestComponent = ({ initialOpen = false, hasElements = true }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    const triggerRef = useRef(null);
    const containerRef = useFocusTrap(isOpen, triggerRef);

    return (
        <div>
            <button ref={triggerRef} data-testid="trigger" onClick={() => setIsOpen(true)}>
                Open
            </button>
            <button data-testid="close" onClick={() => setIsOpen(false)}>
                Close
            </button>
            <div ref={containerRef} data-testid="container">
                {hasElements ? (
                    <>
                        <button data-testid="first">First</button>
                        <input data-testid="second" />
                        <a href="#link" data-testid="third">Third</a>
                    </>
                ) : null}
            </div>
        </div>
    );
};

describe('useFocusTrap Hook', () => {
    it('does not trap focus when isOpen is false', () => {
        render(<TestComponent initialOpen={false} />);
        const trigger = screen.getByTestId('trigger');
        trigger.focus();
        expect(document.activeElement).toBe(trigger);
    });

    it('focuses first element when isOpen becomes true and traps focus', () => {
        render(<TestComponent initialOpen={true} />);
        const first = screen.getByTestId('first');
        expect(document.activeElement).toBe(first);
    });

    it('focuses trigger when isOpen becomes false', () => {
        render(<TestComponent initialOpen={true} />);
        const first = screen.getByTestId('first');
        expect(document.activeElement).toBe(first);

        // Click close button to set isOpen to false
        const closeBtn = screen.getByTestId('close');
        fireEvent.click(closeBtn);

        // Active element should return to trigger
        const trigger = screen.getByTestId('trigger');
        expect(document.activeElement).toBe(trigger);
    });

    it('wraps focus from last to first on Tab keypress', () => {
        render(<TestComponent initialOpen={true} />);
        const first = screen.getByTestId('first');
        const third = screen.getByTestId('third');

        // Focus the last element
        third.focus();
        expect(document.activeElement).toBe(third);

        // Trigger Tab keypress on last element
        const container = screen.getByTestId('container');
        fireEvent.keyDown(container, { key: 'Tab', shiftKey: false });

        expect(document.activeElement).toBe(first);
    });

    it('wraps focus from first to last on Shift+Tab keypress', () => {
        render(<TestComponent initialOpen={true} />);
        const first = screen.getByTestId('first');
        const third = screen.getByTestId('third');

        // Focus first element
        first.focus();
        expect(document.activeElement).toBe(first);

        // Trigger Shift+Tab keypress on first element
        const container = screen.getByTestId('container');
        fireEvent.keyDown(container, { key: 'Tab', shiftKey: true });

        expect(document.activeElement).toBe(third);
    });

    it('ignores non-Tab keydown events', () => {
        render(<TestComponent initialOpen={true} />);
        const first = screen.getByTestId('first');
        expect(document.activeElement).toBe(first);

        const container = screen.getByTestId('container');
        fireEvent.keyDown(container, { key: 'Enter' });

        expect(document.activeElement).toBe(first);
    });

    it('handles empty container safely', () => {
        render(<TestComponent initialOpen={true} hasElements={false} />);
        const trigger = screen.getByTestId('trigger');
        trigger.focus();
        expect(document.activeElement).toBe(trigger);
    });
});
