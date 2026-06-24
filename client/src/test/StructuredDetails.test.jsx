import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StructuredDetails from '../components/StructuredDetails';

describe('StructuredDetails Component', () => {
    it('returns null when items is empty', () => {
        const { container } = render(<StructuredDetails items={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders title type items correctly', () => {
        const items = [
            { type: 'title', title: 'Test <strong>Title</strong>', id: 'title-1' }
        ];
        render(<StructuredDetails items={items} />);
        const titleEl = screen.getByRole('heading', { level: 4 });
        expect(titleEl).toBeInTheDocument();
        expect(titleEl.innerHTML).toBe('Test <strong>Title</strong>');
    });

    it('renders text type items correctly', () => {
        const items = [
            { type: 'text', text: 'Some text description with&nbsp;nbsp', id: 'text-1' }
        ];
        render(<StructuredDetails items={items} />);
        const textEl = screen.getByText('Some text description with nbsp');
        expect(textEl).toBeInTheDocument();
    });

    it('returns null when item has no title and no values', () => {
        const items = [
            { id: 'empty-1' }
        ];
        const { container } = render(<StructuredDetails items={items} />);
        expect(container.querySelector('.structured-details-container')).toBeInTheDocument();
        // Since it returns a container but empty children inside it:
        expect(container.querySelector('.structured-details-container').children.length).toBe(0);
    });

    it('renders values without a title correctly', () => {
        const items = [
            { values: ['Value 1', 'Value 2'], id: 'no-title-1' }
        ];
        render(<StructuredDetails items={items} />);
        expect(screen.getByText('Value 1')).toBeInTheDocument();
        expect(screen.getByText('Value 2')).toBeInTheDocument();
    });

    it('renders title and values pair correctly', () => {
        const items = [
            { title: 'Label', values: ['Value A', 'Value B'], id: 'pair-1' }
        ];
        render(<StructuredDetails items={items} />);
        expect(screen.getByText('Label:')).toBeInTheDocument();
        expect(screen.getByText('Value A')).toBeInTheDocument();
        expect(screen.getByText('Value B')).toBeInTheDocument();
    });

    it('replaces space-y class from parent className correctly', () => {
        const items = [
            { type: 'text', text: 'Text', id: 'text-1' }
        ];
        const { container } = render(
            <StructuredDetails items={items} className="space-y-4 custom-class" />
        );
        const wrapper = container.firstChild;
        expect(wrapper.className).toContain('custom-class');
        expect(wrapper.className).not.toContain('space-y-4');
    });
});
