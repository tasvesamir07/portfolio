import React, { useState, useEffect } from 'react';
import { Mail, Check, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import api from '../../../api';
import ConfirmModal from '../../../components/ConfirmModal';
import { showSiteAlert } from '../../../utils/siteAlerts';

const AdminAnonymousMessages = () => {
    const [messages, setMessages] = useState([]);
    const [filter, setFilter] = useState('all'); // all, unread
    const [loading, setLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await api.get('/anonymous-messages');
            setMessages(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching anonymous messages:', err);
            showSiteAlert('Failed to fetch messages', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleMarkRead = async (id, currentReadStatus) => {
        try {
            await api.put(`/anonymous-messages/${id}`, { is_read: !currentReadStatus });
            showSiteAlert(currentReadStatus ? 'Marked as unread' : 'Marked as read', 'success');
            fetchMessages();
        } catch (err) {
            console.error('Error updating message status:', err);
            showSiteAlert('Failed to update status', 'error');
        }
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            id,
            title: 'Delete Anonymous Message',
            message: 'Are you sure you want to delete this message? This action is permanent and cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`/anonymous-messages/${id}`);
                    showSiteAlert('Message deleted successfully', 'success');
                    fetchMessages();
                } catch (err) {
                    console.error('Error deleting message:', err);
                    showSiteAlert('Failed to delete message', 'error');
                }
                setConfirmModal({ isOpen: false, id: null });
            }
        });
    };

    const filteredMessages = messages.filter(msg => {
        if (filter === 'unread') return !msg.is_read;
        return true;
    });

    const unreadCount = messages.filter(m => !m.is_read).length;

    return (
        <div className="bg-[#fcfaf7] min-h-screen p-6">
            <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-2xl p-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-[#0b3b75] tracking-tight mb-2">Anonymous Messages</h2>
                        <p className="text-sm text-gray-500 font-medium">Read and manage private messages from your website audience.</p>
                    </div>
                    
                    {/* Filter buttons */}
                    <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${filter === 'all' ? 'bg-white text-[#0b3b75] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            All ({messages.length})
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${filter === 'unread' ? 'bg-white text-[#0b3b75] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>
                </div>

                {/* Messages Listing */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-10 h-10 border-4 border-[#0b3b75] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-500 font-bold">Loading messages...</p>
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-3xl">
                        <Mail size={48} className="mx-auto text-gray-300 mb-4 stroke-[1.2]" />
                        <p className="text-gray-400 font-bold text-sm">No anonymous messages found.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredMessages.map((msg) => (
                            <div 
                                key={msg.id}
                                className={`relative p-6 rounded-2xl border transition-all duration-200 ${!msg.is_read ? 'bg-[#ceb079]/5 border-[#ceb079]/30 shadow-md shadow-[#ceb079]/5' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                            >
                                {/* Unread Accent Badge */}
                                {!msg.is_read && (
                                    <span className="absolute top-6 right-6 w-2.5 h-2.5 bg-[#ceb079] rounded-full animate-pulse" title="Unread Message" />
                                )}

                                {/* Card Header Details */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-gray-400 mb-4">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        {new Date(msg.created_at).toLocaleString()}
                                    </span>
                                    <span className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                                    <span className="flex items-center gap-1.5" title="Sender IP for spam verification">
                                        <ShieldAlert size={14} />
                                        IP: {msg.ip_address || 'Unknown'}
                                    </span>
                                </div>

                                {/* Message text */}
                                <p className="text-gray-800 text-sm font-medium leading-relaxed whitespace-pre-wrap mb-6 break-words">
                                    {msg.message}
                                </p>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 border-t border-gray-50 pt-4 mt-2">
                                    <button
                                        onClick={() => handleMarkRead(msg.id, msg.is_read)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${msg.is_read ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-[#ceb079]/15 text-[#ceb079] hover:bg-[#ceb079]/25'}`}
                                    >
                                        <Check size={14} />
                                        {msg.is_read ? 'Mark Unread' : 'Mark Read'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer"
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type="danger"
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal({ isOpen: false, id: null })}
            />
        </div>
    );
};

export default AdminAnonymousMessages;
