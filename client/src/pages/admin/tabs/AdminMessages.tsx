import React, { useState, useEffect } from 'react';
import { Trash2, Eye } from 'lucide-react';
import api, { clearResponseCache } from '../../../api';
import { clearTranslationCache } from '../../../i18n/translator';
import ConfirmModal from '../../../components/ConfirmModal';
import { showSiteAlert } from '../../../utils/siteAlerts';
import { decodeHtmlPreview } from '../components/AdminSharedComponents';

const AdminMessages = () => {
    const [content, setContent] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, onConfirm: null, title: '', message: '', type: 'danger' });

    const openConfirmModal = (title: string, message: string, onConfirm: any, type = 'danger') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/messages');
            setContent(Array.isArray(res.data) ? res.data : [res.data]);
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openEditor = (record: any = {}) => {
        setFormData(record);
        setIsEditing(true);
    };

    const handleDelete = async (id: any) => {
        openConfirmModal(
            'Confirm Deletion',
            'Are you sure you want to delete this message? This action cannot be undone.',
            async () => {
                try {
                    await api.delete(`/messages/${id}`);
                    clearTranslationCache();
                    clearResponseCache();
                    fetchData();
                    showSiteAlert({ type: 'success', message: 'Message deleted.' });
                } catch {
                    showSiteAlert({ type: 'error', message: 'Error deleting item.' });
                }
            }
        );
    };

    if (loading && content.length === 0) {
        return <div className="text-center py-10 font-medium text-gray-500">Loading...</div>;
    }

    return (
        <div>
            {!isEditing ? (
                <div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                        <div className="text-left">
                            <h2 className="text-xl font-bold text-gray-800">Available Messages</h2>
                            <p className="text-sm text-gray-500 font-medium">Currently managing {content.length} records.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Sender Info</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Message Content</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500 text-right min-w-[120px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content.map((item: any, idx: number) => (
                                    <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-gray-900 text-base leading-tight">
                                                {item.name || 'Message'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600 font-medium max-w-md">
                                            <div className="truncate text-xs">
                                                {decodeHtmlPreview(item.message)}
                                            </div>
                                        </td>
                                        <td className="py-4 pl-6 pr-8 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEditor(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="View">
                                                    <Eye size={18} />
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
                                        <td colSpan={3} className="py-16 text-center text-gray-400 font-medium text-sm">No records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto py-4">
                    <div className="mb-10 text-center border-b pb-8">
                        <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                            View Message
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Received message details.
                        </p>
                    </div>
                    <div className="space-y-6 text-left bg-gray-50/70 p-6 rounded-2xl border border-gray-200">
                        <div>
                            <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">Name</div>
                            <div className="font-bold text-gray-800 text-lg">{formData.name || 'Anonymous'}</div>
                        </div>
                        <div>
                            <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">Email</div>
                            <div className="font-bold text-gray-800 text-base">{formData.email || 'No email provided'}</div>
                        </div>
                        <div>
                            <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">Message</div>
                            <div className="text-gray-700 text-base bg-white border rounded-xl p-4 whitespace-pre-wrap leading-relaxed shadow-sm min-h-[140px]">{formData.message || 'No message content.'}</div>
                        </div>
                    </div>
                    <div className="flex justify-center mt-10">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-10 py-3 bg-gray-900 hover:bg-black text-white rounded font-bold text-sm transition-all sm:min-w-[120px]">Back to list</button>
                    </div>
                </div>
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

export default AdminMessages;
