import React, { useState, useEffect } from 'react';
import { Edit3, Save, AlertCircle } from 'lucide-react';
import api, { clearResponseCache } from '../../../api';
import { clearTranslationCache } from '../../../i18n/translator';
import { storeSessionToken } from '../../../utils/authSession';
import { Field } from '../components/AdminSharedComponents';

const PROFILE_OTP_REGEX = /^\d{0,6}$/;

const AdminProfile = () => {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [notice, setNotice] = useState(null);
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!notice) return undefined;
        const timer = setTimeout(() => setNotice(null), 2600);
        return () => clearTimeout(timer);
    }, [notice]);

    useEffect(() => {
        if (!saveError) return undefined;
        const timer = setTimeout(() => setSaveError(''), 5000);
        return () => clearTimeout(timer);
    }, [saveError]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/profile');
            setContent(res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null);
        } catch (err) {
            console.error('Error fetching profile data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const prepareProfileFormData = (profile = {}) => ({
        ...profile,
        username: profile.username || '',
        email: profile.email || '',
        password: '',
        confirm_password: '',
        otp: '',
        otp_requested: false,
        otp_recipient: ''
    });

    const openEditor = (profile) => {
        setFormData(prepareProfileFormData(profile));
        setIsEditing(true);
    };

    const updateProfileDraft = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
            otp_requested: false,
            otp: '',
            otp_recipient: ''
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaveError('');
        setSaving(true);
        try {
            const username = (formData.username || '').trim();
            const email = (formData.email || '').trim().toLowerCase();
            const password = formData.password || '';
            const confirmPassword = formData.confirm_password || '';
            const otp = (formData.otp || '').trim();

            if (!username) {
                throw new Error('Username is required.');
            }

            if (!email) {
                throw new Error('Email is required for OTP verification.');
            }

            if (password && password.length < 6) {
                throw new Error('Password must be at least 6 characters long.');
            }

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match.');
            }

            if (!formData.otp_requested) {
                const res = await api.post('/profile-otp', {
                    username,
                    email,
                    password
                });

                setFormData((prev) => ({
                    ...prev,
                    username,
                    email,
                    otp_requested: true,
                    otp: '',
                    otp_recipient: res.data?.recipientEmail || email
                }));
                setNotice({ type: 'success', message: res.data?.message || 'OTP sent successfully.' });
                return;
            }

            if (!/^\d{6}$/.test(otp)) {
                throw new Error('Enter the 6-digit OTP sent to your email.');
            }

            const res = await api.post('/profile-confirm', { otp });
            if (res.data?.token) {
                storeSessionToken(res.data.token);
            }

            setIsEditing(false);
            setNotice({ type: 'success', message: res.data?.message || 'Profile updated successfully.' });
            clearTranslationCache();
            clearResponseCache();
            fetchData();
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            setSaveError(err.response?.data?.message || err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading && !content) {
        return <div className="text-center py-10 font-medium text-gray-500">Loading...</div>;
    }

    return (
        <div>
            {notice && (
                <div className="fixed right-5 top-5 z-[80] rounded-xl border border-brand-gold/20 bg-brand-gold/[0.03] px-4 py-3 text-sm font-semibold text-brand-gold shadow-lg">
                    {notice.message}
                </div>
            )}

            {!isEditing ? (
                <div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                        <div className="text-left">
                            <h2 className="text-xl font-bold text-gray-800">Admin Account Info</h2>
                            <p className="text-sm text-gray-500 font-medium">Currently managing admin login credentials.</p>
                        </div>
                        <button 
                            onClick={() => openEditor(content || {})} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 w-full md:w-auto"
                        >
                            <Edit3 size={18} /> Edit Profile
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Username</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Email Address</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500 text-right min-w-[120px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content ? (
                                    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-gray-900 text-base leading-tight">
                                                {content.username || 'Admin User'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600 font-medium max-w-md">
                                            <div className="text-sm">
                                                {content.email || 'No email configured'}
                                            </div>
                                        </td>
                                        <td className="py-4 pl-6 pr-8 text-right whitespace-nowrap">
                                            <button 
                                                onClick={() => openEditor(content)} 
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all inline-block" 
                                                title="Edit"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="py-16 text-center text-gray-400 font-medium text-sm">No profiles found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSave} className="max-w-3xl mx-auto py-4">
                    <div className="mb-10 text-center border-b pb-8">
                        <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                            Update Profile
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Update your username, email, or password. A 6-digit OTP will be sent to verify the change before it is applied.
                        </p>
                    </div>
                    {saveError && (
                        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{saveError}</span>
                        </div>
                    )}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                Save once to send a 6-digit OTP. Save again with that OTP to confirm the update. Requesting a new OTP immediately invalidates the previous one.
                            </div>
                            <Field label="Username" required>
                                <input
                                    className="input"
                                    value={formData.username || ''}
                                    onChange={(e) => updateProfileDraft('username', e.target.value)}
                                    required
                                />
                            </Field>
                            <Field label="Email" required>
                                <input
                                    type="email"
                                    className="input"
                                    value={formData.email || ''}
                                    onChange={(e) => updateProfileDraft('email', e.target.value)}
                                    required
                                />
                            </Field>
                            <Field label="New Password">
                                <input
                                    type="password"
                                    className="input"
                                    value={formData.password || ''}
                                    onChange={(e) => updateProfileDraft('password', e.target.value)}
                                    placeholder="Leave empty to keep the current password"
                                />
                            </Field>
                            <Field label="Confirm New Password">
                                <input
                                    type="password"
                                    className="input"
                                    value={formData.confirm_password || ''}
                                    onChange={(e) => updateProfileDraft('confirm_password', e.target.value)}
                                    placeholder="Repeat the new password"
                                />
                            </Field>
                            {formData.otp_requested && (
                                <>
                                    <div className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                        OTP sent to {formData.otp_recipient || formData.email}. It stays valid for 5 minutes unless you request a new code.
                                    </div>
                                    <Field label="6-Digit OTP" required>
                                        <input
                                            className="input tracking-[0.4em] text-center text-lg font-bold"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={formData.otp || ''}
                                            onChange={(e) => {
                                                const nextValue = e.target.value.replace(/\D/g, '');
                                                if (!PROFILE_OTP_REGEX.test(nextValue)) return;
                                                setFormData((prev) => ({ ...prev, otp: nextValue }));
                                            }}
                                            placeholder="000000"
                                            required
                                        />
                                    </Field>
                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, otp_requested: false, otp: '', otp_recipient: '' }))}
                                            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 mb-6"
                                        >
                                            Request New OTP
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-12 justify-center">
                        <button type="submit" disabled={saving} className={`bg-gray-900 hover:bg-black text-white px-10 py-3 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 sm:min-w-[200px] ${saving ? 'opacity-70 cursor-wait' : ''}`}>
                            <Save size={18} /> {saving ? 'Saving...' : formData.otp_requested ? 'Verify OTP & Update' : 'Send OTP'}
                        </button>
                        <button type="button" onClick={() => setIsEditing(false)} disabled={saving} className="px-10 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded font-bold text-sm text-gray-600 transition-all sm:min-w-[120px] disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default AdminProfile;
