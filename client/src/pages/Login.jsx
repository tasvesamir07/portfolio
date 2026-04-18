import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Mail, KeyRound, ChevronLeft } from 'lucide-react';
import api from '../api';
import { storeSessionToken } from '../utils/authSession';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Forgot Password Flow States
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP/New Pass
    const [resetEmail, setResetEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/admin-login', { identifier, password });
            storeSessionToken(res.data.token);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await api.post('/forgot-password', { email: resetEmail });
            setSuccess(res.data.message);
            setResetStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match');
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/reset-password', { 
                email: resetEmail, 
                otp, 
                newPassword 
            });
            setSuccess(res.data.message);
            setTimeout(() => {
                setIsForgotPassword(false);
                setResetStep(1);
                setSuccess('');
                setError('');
                setPassword('');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const toggleForgotPassword = () => {
        setIsForgotPassword(!isForgotPassword);
        setResetStep(1);
        setError('');
        setSuccess('');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded border border-gray-200 shadow-sm w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="bg-gray-100 w-16 h-16 rounded flex items-center justify-center mx-auto mb-6 text-gray-900">
                        {isForgotPassword ? <Mail size={32} /> : <Lock size={32} />}
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
                        {isForgotPassword ? 'Reset Password' : 'Admin Access'}
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">
                        {isForgotPassword 
                            ? (resetStep === 1 ? 'Enter email to receive OTP' : 'Check your email for the 6-digit code')
                            : 'Verify credentials to manage portfolio'
                        }
                    </p>
                </div>

                {!isForgotPassword ? (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-gray-400 mb-2">Username or Email</label>
                            <input 
                                type="text" 
                                required
                                className="input"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-gray-400">Password</label>
                                <button 
                                    type="button" 
                                    onClick={toggleForgotPassword}
                                    className="text-xs text-accent-primary hover:underline font-medium"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required
                                    className="input pr-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent-primary transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full btn-primary"
                        >
                            {loading ? 'Logging in...' : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        {resetStep === 1 ? (
                            <form onSubmit={handleRequestOtp} className="space-y-6">
                                <div>
                                    <label className="block text-gray-400 mb-2">Registered Email</label>
                                    <input 
                                        type="email" 
                                        required
                                        className="input"
                                        placeholder="admin@example.com"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full btn-primary"
                                >
                                    {loading ? 'Sending OTP...' : 'Get Reset Code'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-6">
                                <div>
                                    <label className="block text-gray-400 mb-2">6-Digit OTP</label>
                                    <input 
                                        type="text" 
                                        required
                                        maxLength="6"
                                        className="input font-mono text-center tracking-[0.5em] text-xl"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-400 mb-2">New Password</label>
                                        <input 
                                            type="password" 
                                            required
                                            className="input"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-400 mb-2">Confirm New Password</label>
                                        <input 
                                            type="password" 
                                            required
                                            className="input"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full btn-primary"
                                >
                                    {loading ? 'Resetting...' : 'Update Password'}
                                </button>
                            </form>
                        )}
                        <button 
                            type="button"
                            onClick={toggleForgotPassword}
                            className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
                        >
                            <ChevronLeft size={16} /> Back to Sign In
                        </button>
                    </div>
                )}

                {error && <p className="mt-6 text-red-500 text-center text-sm bg-red-50 p-3 rounded border border-red-100">{error}</p>}
                {success && <p className="mt-6 text-emerald-600 text-center text-sm bg-emerald-50 p-3 rounded border border-emerald-100">{success}</p>}

                <div className="mt-10 text-center">
                    {!isForgotPassword && (
                        <Link to="/" className="text-gray-400 hover:text-gray-900 transition-colors text-sm font-medium">
                            Back to Portfolio
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
