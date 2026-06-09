import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import api from '../api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../api', () => ({
    default: {
        post: vi.fn(),
    },
}));

describe('Login Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the login page correctly', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        expect(screen.getByText('Admin Access')).toBeInTheDocument();
        expect(screen.getByText('Username or Email')).toBeInTheDocument();
        expect(screen.getByText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('submits form credentials and navigates on success', async () => {
        api.post.mockResolvedValueOnce({
            data: { token: 'mocked_token' }
        });

        const { container } = render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        const identifierInput = container.querySelector('input[type="text"]');
        const passwordInput = container.querySelector('input[type="password"]');

        fireEvent.change(identifierInput, { target: { value: 'admin' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        const submitBtn = screen.getByRole('button', { name: /sign in/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/admin-login', {
                identifier: 'admin',
                password: 'password123',
            });
            expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
        });
    });

    it('renders error message when login fails', async () => {
        api.post.mockRejectedValueOnce({
            response: {
                data: { message: 'Invalid credentials' }
            }
        });

        const { container } = render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        const identifierInput = container.querySelector('input[type="text"]');
        const passwordInput = container.querySelector('input[type="password"]');

        fireEvent.change(identifierInput, { target: { value: 'admin' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

        const submitBtn = screen.getByRole('button', { name: /sign in/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });
});
