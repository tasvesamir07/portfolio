import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import api from '../api';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Use a Vercel-safe login route (avoid /api/auth/* path conflicts).
            const res = await api.post('/admin-login', { username, password });
            localStorage.setItem('samir_portfolio_token', res.data.token);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded border border-gray-200 shadow-sm w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="bg-gray-100 w-16 h-16 rounded flex items-center justify-center mx-auto mb-6 text-gray-900">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">Admin Access</h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">Verify credentials to manage portfolio</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-gray-400 mb-2">Username</label>
                        <input 
                            type="text" 
                            required
                            className="input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-2">Password</label>
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
                    {error && <p className="text-red-500 text-center text-sm">{error}</p>}
                </form>
                <div className="mt-8 text-center">
                    <Link to="/" className="text-gray-500 hover:text-white transition-colors">Back to Portfolio</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
