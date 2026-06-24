import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

    afterEach(() => {
        vi.useRealTimers();
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

    it('toggles password visibility when toggle button is clicked', () => {
        const { container } = render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        const passwordInput = container.querySelector('input[type="password"]');
        expect(passwordInput.type).toBe('password');

        // Toggle button has the eye icon inside
        const toggleBtn = screen.getByRole('button', { name: '' });
        fireEvent.click(toggleBtn);
        expect(passwordInput.type).toBe('text');

        fireEvent.click(toggleBtn);
        expect(passwordInput.type).toBe('password');
    });

    it('handles the forgot password flow successfully', async () => {
        // Mock OTP send request
        api.post.mockResolvedValueOnce({
            data: { message: 'OTP sent to email' }
        });

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        // Click Forgot Password link
        const forgotLink = screen.getByRole('button', { name: /forgot password/i });
        fireEvent.click(forgotLink);

        expect(screen.getByText('Reset Password')).toBeInTheDocument();
        expect(screen.getByText('Enter email to receive OTP')).toBeInTheDocument();

        // Fill in email
        const emailInput = screen.getByPlaceholderText('admin@example.com');
        fireEvent.change(emailInput, { target: { value: 'admin@test.com' } });

        // Submit to get reset code
        const getCodeBtn = screen.getByRole('button', { name: /get reset code/i });
        fireEvent.click(getCodeBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/forgot-password', { email: 'admin@test.com' });
            expect(screen.getByText('OTP sent to email')).toBeInTheDocument();
        });

        // Step 2 should be active now
        expect(screen.getByText('Check your email for the 6-digit code')).toBeInTheDocument();

        // Mock Reset password request
        api.post.mockResolvedValueOnce({
            data: { message: 'Password updated successfully' }
        });

        // Fill in OTP, new password and confirm password
        const otpInput = screen.getByPlaceholderText('000000');
        fireEvent.change(otpInput, { target: { value: '123456' } });

        const passInput1 = document.querySelectorAll('input[type="password"]')[0];
        const passInput2 = document.querySelectorAll('input[type="password"]')[1];
        fireEvent.change(passInput1, { target: { value: 'newpassword123' } });
        fireEvent.change(passInput2, { target: { value: 'newpassword123' } });

        // Enable fake timers before submitting the password reset (which triggers setTimeout redirect)
        vi.useFakeTimers();

        // Submit new password
        const updateBtn = screen.getByRole('button', { name: /update password/i });
        fireEvent.click(updateBtn);

        // Flush microtasks (resolve post promise)
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(api.post).toHaveBeenCalledWith('/reset-password', {
            email: 'admin@test.com',
            otp: '123456',
            newPassword: 'newpassword123'
        });
        expect(screen.getByText('Password updated successfully')).toBeInTheDocument();

        // Fast forward timers to verify redirect back to sign in
        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(screen.getByText('Admin Access')).toBeInTheDocument();
    });

    it('displays error if passwords do not match during reset', async () => {
        api.post.mockResolvedValueOnce({
            data: { message: 'OTP sent to email' }
        });

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), { target: { value: 'admin@test.com' } });
        fireEvent.click(screen.getByRole('button', { name: /get reset code/i }));

        await waitFor(() => {
            expect(screen.getByText('OTP sent to email')).toBeInTheDocument();
        });

        // Mismatched passwords
        fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
        const passInput1 = document.querySelectorAll('input[type="password"]')[0];
        const passInput2 = document.querySelectorAll('input[type="password"]')[1];
        fireEvent.change(passInput1, { target: { value: 'pass1' } });
        fireEvent.change(passInput2, { target: { value: 'pass2' } });

        fireEvent.click(screen.getByRole('button', { name: /update password/i }));

        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('shows error if forgot password or reset password api fails', async () => {
        // Forgot password fails
        api.post.mockRejectedValueOnce({
            response: { data: { message: 'Email not registered' } }
        });

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
        fireEvent.change(screen.getByPlaceholderText('admin@example.com'), { target: { value: 'admin@test.com' } });
        fireEvent.click(screen.getByRole('button', { name: /get reset code/i }));

        await waitFor(() => {
            expect(screen.getByText('Email not registered')).toBeInTheDocument();
        });

        // Reset password fails
        api.post.mockResolvedValueOnce({ data: { message: 'OTP sent' } }); // step 1 succeeds
        fireEvent.click(screen.getByRole('button', { name: /get reset code/i }));

        await waitFor(() => {
            expect(screen.getByText('Check your email for the 6-digit code')).toBeInTheDocument();
        });

        api.post.mockRejectedValueOnce({
            response: { data: { message: 'Invalid OTP' } }
        });

        fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '111111' } });
        const passInput1 = document.querySelectorAll('input[type="password"]')[0];
        const passInput2 = document.querySelectorAll('input[type="password"]')[1];
        fireEvent.change(passInput1, { target: { value: 'pass123' } });
        fireEvent.change(passInput2, { target: { value: 'pass123' } });

        fireEvent.click(screen.getByRole('button', { name: /update password/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid OTP')).toBeInTheDocument();
        });
    });

    it('returns to login screen when clicking back button', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
        expect(screen.getByText('Reset Password')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
        expect(screen.getByText('Admin Access')).toBeInTheDocument();
    });
});
