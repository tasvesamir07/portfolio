import React, { useState, useEffect } from 'react';
import { Search, Edit3, Save, Trash2, X, RefreshCw } from 'lucide-react';
import api from '../../../api';
import { clearTranslationCache } from '../../../i18n/translator';
import ConfirmModal from '../../../components/ConfirmModal';
import { showSiteAlert } from '../../../utils/siteAlerts';

const AdminTranslation = () => {
    const [cache, setCache] = useState([]);
    const [filteredCache, setFilteredCache] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '', type: 'danger' });

    const fetchCache = async () => {
        setLoading(true);
        try {
            const res = await api.get('/translate/cache');
            setCache(res.data.cache || []);
        } catch (err) {
            console.error('Error fetching translation cache:', err);
            showSiteAlert('Failed to fetch translations', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCache();
    }, []);

    useEffect(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = cache.filter(item => 
            (item.originalText || '').toLowerCase().includes(lowerCaseQuery) ||
            (item.translatedText || '').toLowerCase().includes(lowerCaseQuery)
        );
        setFilteredCache(filtered);
    }, [searchQuery, cache]);

    const handleEditStart = (item) => {
        setEditingKey(item.key);
        setEditingText(item.translatedText);
    };

    const handleEditCancel = () => {
        setEditingKey(null);
        setEditingText('');
    };

    const handleSave = async (key) => {
        setSaving(true);
        try {
            await api.put('/translate/cache', { key, translatedText: editingText });
            showSiteAlert('Translation updated successfully', 'success');
            setEditingKey(null);
            setEditingText('');
            
            // Invalidate client caches
            clearTranslationCache();
            
            // Reload list
            fetchCache();
        } catch (err) {
            console.error('Error updating translation:', err);
            showSiteAlert('Failed to update translation', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (key) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Translation Entry',
            message: 'Are you sure you want to delete this translation entry? The system will auto-translate it again on next demand.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete('/translate/cache', { data: { key } });
                    showSiteAlert('Translation entry deleted', 'success');
                    clearTranslationCache();
                    fetchCache();
                } catch (err) {
                    console.error('Error deleting translation:', err);
                    showSiteAlert('Failed to delete translation', 'error');
                }
                setConfirmModal({ isOpen: false });
            }
        });
    };

    const handleForceRefreshClient = () => {
        clearTranslationCache();
        showSiteAlert('Client translation cache cleared', 'success');
        window.location.reload();
    };

    return (
        <div className="bg-[#fcfaf7] min-h-screen p-6">
            <div className="max-w-7xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-2xl p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-[#0b3b75] tracking-tight mb-2">Translation Manager</h2>
                        <p className="text-sm text-gray-500 font-medium">Review, correct, and manage automatically cached text translations.</p>
                    </div>
                    <button
                        onClick={handleForceRefreshClient}
                        className="flex items-center gap-2 px-5 py-3 bg-[#0b3b75] hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                        <RefreshCw size={15} />
                        Clear Client Cache
                    </button>
                </div>

                <div className="relative mb-6">
                    <input
                        type="text"
                        placeholder="Search translations by original or translated text..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#0b3b75] transition-all text-sm font-semibold"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-10 h-10 border-4 border-[#0b3b75] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-500 font-bold">Loading translations...</p>
                    </div>
                ) : filteredCache.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
                        <p className="text-gray-400 font-bold text-sm">No translations found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-black uppercase tracking-wider text-gray-500">
                                    <th className="px-6 py-4 w-20">Lang</th>
                                    <th className="px-6 py-4">Original Text (Source)</th>
                                    <th className="px-6 py-4">Translated Text</th>
                                    <th className="px-6 py-4 w-32 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm font-medium text-gray-700">
                                {filteredCache.map((item) => (
                                    <tr key={item.key} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#ceb079]/10 text-[#ceb079] uppercase">
                                                {item.sourceLang} &rarr; {item.targetLang}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate" title={item.originalText}>
                                            {item.originalText}
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingKey === item.key ? (
                                                <textarea
                                                    rows={2}
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    className="w-full p-2.5 border border-[#ceb079] rounded-xl outline-none text-sm bg-white"
                                                />
                                            ) : (
                                                <span className="text-gray-900 font-semibold">{item.translatedText}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {editingKey === item.key ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSave(item.key)}
                                                        disabled={saving}
                                                        className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"
                                                        title="Save Changes"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    <button
                                                        onClick={handleEditCancel}
                                                        className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                                        title="Cancel"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditStart(item)}
                                                        className="p-2 bg-[#ceb079]/10 text-[#ceb079] hover:bg-[#ceb079]/20 rounded-lg transition-colors cursor-pointer"
                                                        title="Edit Translation"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.key)}
                                                        className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                                                        title="Delete Entry"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal({ isOpen: false })}
            />
        </div>
    );
};

export default AdminTranslation;
