import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import api, { clearResponseCache } from '../../../api';
import { clearTranslationCache } from '../../../i18n/translator';
import ConfirmModal from '../../../components/ConfirmModal';
import { showSiteAlert } from '../../../utils/siteAlerts';
import {
    Field,
    decodeHtmlPreview
} from '../components/AdminSharedComponents';
import { availableSocialPlatforms } from '../../../utils/socialIcons';

const AdminSocial = () => {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '', type: 'danger' });
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

    const openConfirmModal = (title, message, onConfirm, type = 'danger') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/social-links');
            setContent(Array.isArray(res.data) ? res.data : [res.data]);
        } catch (err) {
            console.error('Error fetching social links:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openEditor = (record = {}) => {
        setFormData(record);
        setIsEditing(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaveError('');
        setSaving(true);
        try {
            if (formData.id) {
                await api.put(`/social-links/${formData.id}`, formData);
            } else {
                await api.post('/social-links', formData);
            }

            setIsEditing(false);
            setNotice({ type: 'success', message: 'Saved successfully.' });
            clearTranslationCache();
            clearResponseCache();
            fetchData();
        } catch (err) {
            setSaveError(err.response?.data?.message || err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        openConfirmModal(
            'Confirm Deletion',
            'Are you sure you want to delete this social link? This action cannot be undone.',
            async () => {
                try {
                    await api.delete(`/social-links/${id}`);
                    clearTranslationCache();
                    clearResponseCache();
                    fetchData();
                    showSiteAlert({ type: 'success', message: 'Link deleted.' });
                } catch {
                    showSiteAlert({ type: 'error', message: 'Error deleting item.' });
                }
            }
        );
    };

    const handleMove = async (index, direction) => {
        const newContent = [...content];
        const targetIndex = index + direction;
        
        if (targetIndex < 0 || targetIndex >= newContent.length) return;
        
        const temp = newContent[index];
        newContent[index] = newContent[targetIndex];
        newContent[targetIndex] = temp;
        
        setContent(newContent);
        
        const orders = newContent.map((item, idx) => ({
            id: item.id,
            sort_order: idx
        }));
        
        try {
            await api.put('/reorder/social_links', { orders });
            clearTranslationCache();
            clearResponseCache();
            fetchData();
        } catch (err) {
            console.error('Error reordering:', err);
            fetchData();
        }
    };

    if (loading && content.length === 0) {
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
                            <h2 className="text-xl font-bold text-gray-800">Available Entries</h2>
                            <p className="text-sm text-gray-500 font-medium">Currently managing {content.length} records.</p>
                        </div>
                        <button 
                            onClick={() => openEditor({})} 
                            className="bg-gray-800 hover:bg-black text-white px-6 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 w-full md:w-auto"
                        >
                            <Plus size={18} /> Add New Social Link
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Platform</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Profile URL</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500 text-right min-w-[180px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content.map((item, idx) => (
                                    <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-gray-900 text-base leading-tight">
                                                {item.platform || 'Social Link'}
                                            </div>
                                            <div className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase">
                                                Icon: {item.icon_name || 'Globe'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600 font-medium max-w-md">
                                            <div className="truncate text-xs">
                                                {item.url}
                                            </div>
                                        </td>
                                        <td className="py-4 pl-6 pr-8 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <div className="flex flex-col gap-0.5 mr-2">
                                                    <button 
                                                        onClick={() => handleMove(idx, -1)}
                                                        disabled={idx === 0}
                                                        className={`p-1 rounded transition-colors ${idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-brand-blue hover:bg-gray-100'}`}
                                                        title="Move Up"
                                                    >
                                                        <ArrowUp size={16} strokeWidth={2} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleMove(idx, 1)}
                                                        disabled={idx === content.length - 1}
                                                        className={`p-1 rounded transition-colors ${idx === content.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-brand-blue hover:bg-gray-100'}`}
                                                        title="Move Down"
                                                    >
                                                        <ArrowDown size={16} strokeWidth={2} />
                                                    </button>
                                                </div>
                                                <button onClick={() => openEditor(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="Edit">
                                                    <Edit3 size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {content.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="py-16 text-center text-gray-400 font-medium text-sm">No records found.</td>
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
                            {formData.id ? 'Edit Entry' : 'Add New Entry'}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Fill in the fields below. Fields marked with <span className="text-red-500">*</span> are mandatory.
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
                            <Field label="Platform Name" required>
                                <input className="input" value={formData.platform || ''} onChange={e => setFormData({...formData, platform: e.target.value})} placeholder="e.g. GitHub" required />
                            </Field>
                            <Field label="Icon Selection" required>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 mt-1 max-h-60 overflow-y-auto p-1 border border-gray-200 rounded-lg bg-gray-50/50">
                                    {availableSocialPlatforms.map((platform) => {
                                        const Icon = platform.icon;
                                        const isSelected = (formData.icon_name || '').toLowerCase().replace(/[\s-_]/g, '') === platform.id;
                                        return (
                                            <button
                                                key={platform.id}
                                                type="button"
                                                onClick={() => setFormData({ 
                                                    ...formData, 
                                                    icon_name: platform.id, 
                                                    platform: platform.label,
                                                    color_class: platform.colorClass 
                                                })}
                                                className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${isSelected ? 'border-[#0b3b75] bg-[#0b3b75]/5 text-[#0b3b75] font-bold shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}
                                            >
                                                <Icon size={18} />
                                                <span className="text-[9px] font-bold uppercase truncate w-full text-center">{platform.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>
                            <div className="md:col-span-2">
                                <Field label="Full profile URL" required>
                                    <input className="input" value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." required />
                                </Field>
                            </div>
                            <Field label="Color Theme">
                                <select 
                                    className="input" 
                                    value={formData.color_class || ''} 
                                    onChange={e => setFormData({...formData, color_class: e.target.value})}
                                >
                                    <option value="hover:text-gray-900">Default (Dark Gray)</option>
                                    <option value="hover:text-blue-600">Blue (LinkedIn Style)</option>
                                    <option value="hover:text-sky-500">Sky Blue (Twitter Style)</option>
                                    <option value="hover:text-pink-600">Pink (Instagram Style)</option>
                                    <option value="hover:text-brand-blue">Orange (Mail Style)</option>
                                    <option value="hover:text-emerald-600">Emerald (Creative Style)</option>
                                </select>
                            </Field>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-12 justify-center">
                        <button type="submit" disabled={saving} className={`bg-gray-900 hover:bg-black text-white px-10 py-3 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 sm:min-w-[200px] ${saving ? 'opacity-70 cursor-wait' : ''}`}>
                            <Save size={18} /> {saving ? 'Saving...' : formData.id ? 'Update Record' : 'Save Record'}
                        </button>
                        <button type="button" onClick={() => setIsEditing(false)} disabled={saving} className="px-10 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded font-bold text-sm text-gray-600 transition-all sm:min-w-[120px] disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
                    </div>
                </form>
            )}

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />
        </div>
    );
};

export default AdminSocial;
