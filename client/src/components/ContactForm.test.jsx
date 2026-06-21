import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactForm from './ContactForm';
import api from '../api';

vi.mock('../i18n/I18nContext', () => ({
    useI18n: () => ({
        t: (key) => key
    })
}));

vi.mock('../api', () => ({
    default: {
        post: vi.fn()
    }
}));

describe('ContactForm Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the contact form inputs correctly', () => {
        render(<ContactForm />);

        expect(screen.getByPlaceholderText('contact.namePlaceholder')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('contact.emailPlaceholder')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('contact.messagePlaceholder')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'contact.sendMessage' })).toBeInTheDocument();
    });

    it('submits message successfully and shows success screen', async () => {
        api.post.mockResolvedValueOnce({ data: { success: true } });

        render(<ContactForm />);

        fireEvent.change(screen.getByPlaceholderText('contact.namePlaceholder'), { target: { value: 'Samir' } });
        fireEvent.change(screen.getByPlaceholderText('contact.emailPlaceholder'), { target: { value: 'samir@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('contact.messagePlaceholder'), { target: { value: 'Hello researcher!' } });

        fireEvent.click(screen.getByRole('button', { name: 'contact.sendMessage' }));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/messages', {
                name: 'Samir',
                email: 'samir@example.com',
                message: 'Hello researcher!'
            });
            expect(screen.getByText('contact.successTitle')).toBeInTheDocument();
            expect(screen.getByText('contact.successMessage')).toBeInTheDocument();
        });
    });

    it('handles message submission errors', async () => {
        api.post.mockRejectedValueOnce(new Error('Network Error'));

        render(<ContactForm />);

        fireEvent.change(screen.getByPlaceholderText('contact.namePlaceholder'), { target: { value: 'Samir' } });
        fireEvent.change(screen.getByPlaceholderText('contact.emailPlaceholder'), { target: { value: 'samir@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('contact.messagePlaceholder'), { target: { value: 'Hello!' } });

        fireEvent.click(screen.getByRole('button', { name: 'contact.sendMessage' }));

        await waitFor(() => {
            expect(screen.getByText('contact.error')).toBeInTheDocument();
        });
    });
});
