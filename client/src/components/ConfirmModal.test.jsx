import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from './ConfirmModal';

describe('ConfirmModal Component', () => {
    it('renders correctly when open', () => {
        const handleClose = vi.fn();
        const handleConfirm = vi.fn();

        render(
            <ConfirmModal
                isOpen={true}
                onClose={handleClose}
                onConfirm={handleConfirm}
                title="Test Modal"
                message="Are you sure you want to test?"
            />
        );

        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to test?')).toBeInTheDocument();
    });

    it('triggers onConfirm and onClose actions', () => {
        const handleClose = vi.fn();
        const handleConfirm = vi.fn();

        render(
            <ConfirmModal
                isOpen={true}
                onClose={handleClose}
                onConfirm={handleConfirm}
                title="Test Modal"
                message="Are you sure you want to test?"
                confirmText="Confirm Test"
            />
        );

        const confirmBtn = screen.getByText('Confirm Test');
        fireEvent.click(confirmBtn);

        expect(handleConfirm).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });
});
