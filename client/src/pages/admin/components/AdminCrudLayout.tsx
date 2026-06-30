// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit3, ArrowUp, ArrowDown, AlertCircle, ArrowLeft, Save } from 'lucide-react';
import api, { clearResponseCache } from '../../../api';
import { clearTranslationCache } from '../../../i18n/translator';
import ConfirmModal from '../../../components/ConfirmModal';
import { showSiteAlert } from '../../../utils/siteAlerts';
import StickySaveBar from './StickySaveBar';

const getEndpointWithId = (endpoint, id) => {
    if (!id) return endpoint;
    const [base, query] = endpoint.split('?');
    return query ? `${base}/${id}?${query}` : `${base}/${id}`;
};

export const AdminCrudLayout = ({
    title,
    entityName,
    apiEndpoint,
    reorderEndpoint,
    autosaveKey,
    columns = [],
    renderRowCells,
    renderFormFields,
    prepareFormData = (record) => record,
    preparePayloadData = (data) => data,
    defaultNewRecord = () => ({}),
    manageCountText = (count) => `Currently managing ${count} records.`,
    addNewText = `Add New ${entityName}`
}) => {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [initialData, setInitialData] = useState({});
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '', type: 'danger' });
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [draftAvailable, setDraftAvailable] = useState(false);
    const [draftData, setDraftData] = useState(null);

    const headerRef = useRef(null);

    useEffect(() => {
        if (!saveError) return undefined;
        const timer = setTimeout(() => setSaveError(''), 5000);
        return () => clearTimeout(timer);
    }, [saveError]);

    const openConfirmModal = (modalTitle, message, onConfirm, type = 'danger') => {
        setConfirmModal({ isOpen: true, title: modalTitle, message, onConfirm, type });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(apiEndpoint);
            setContent(Array.isArray(res.data) ? res.data : [res.data]);
        } catch (err) {
            console.error(`Error fetching ${apiEndpoint}:`, err);
        } finally {
            setContent((current) => Array.isArray(current) ? current : []);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Autosave local storage save trigger
    useEffect(() => {
        if (!isEditing || !autosaveKey) return;
        const timer = setTimeout(() => {
            if (JSON.stringify(formData) !== JSON.stringify(initialData)) {
                localStorage.setItem(autosaveKey, JSON.stringify({
                    formData,
                    timestamp: Date.now()
                }));
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [formData, isEditing, initialData, autosaveKey]);

    const openEditor = (record = {}) => {
        const prepared = prepareFormData(record);
        setFormData(prepared);
        setInitialData(prepared);
        setIsEditing(true);
        setSaveError('');

        // Check if there is an autosaved draft
        if (autosaveKey) {
            const saved = localStorage.getItem(autosaveKey);
            if (saved) {
                try {
                    const { formData: savedForm, timestamp } = JSON.parse(saved);
                    // Only prompt if draft is different from the currently loaded entity
                    if (JSON.stringify(savedForm) !== JSON.stringify(prepared)) {
                        setDraftAvailable(true);
                        setDraftData(savedForm);
                    }
                } catch {
                    localStorage.removeItem(autosaveKey);
                }
            }
        }
    };

    const handleRestoreDraft = () => {
        if (draftData) {
            const restored = { ...draftData };
            if (initialData?.id) restored.id = initialData.id;
            setFormData(restored);
            setDraftAvailable(false);
            showSiteAlert({ type: 'success', message: 'Restored unsaved draft.' });
        }
    };

    const handleDiscardDraft = () => {
        if (autosaveKey) {
            localStorage.removeItem(autosaveKey);
        }
        setDraftAvailable(false);
        showSiteAlert({ type: 'info', message: 'Draft discarded.' });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaveError('');
        setSaving(true);
        try {
            const payload = preparePayloadData(formData);
            if (formData.id) {
                await api.put(getEndpointWithId(apiEndpoint, formData.id), payload);
            } else {
                await api.post(apiEndpoint, payload);
            }

            // Success, clear draft
            if (autosaveKey) {
                localStorage.removeItem(autosaveKey);
            }
            setDraftAvailable(false);
            setIsEditing(false);
            showSiteAlert({ type: 'success', message: 'Saved successfully.' });
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
            'Are you sure you want to delete this record? This action cannot be undone.',
            async () => {
                try {
                    await api.delete(getEndpointWithId(apiEndpoint, id));
                    clearTranslationCache();
                    clearResponseCache();
                    fetchData();
                    showSiteAlert({ type: 'success', message: 'Record deleted.' });
                } catch {
                    showSiteAlert({ type: 'error', message: 'Error deleting item.' });
                }
            }
        );
    };

    const handleMove = async (index, direction) => {
        if (!reorderEndpoint) return;
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
            await api.put(reorderEndpoint, { orders });
            clearTranslationCache();
            clearResponseCache();
            fetchData();
        } catch (err) {
            console.error('Error reordering:', err);
            fetchData();
        }
    };

    const handleCancel = () => {
        if (autosaveKey) {
            localStorage.removeItem(autosaveKey);
        }
        setDraftAvailable(false);
        setIsEditing(false);
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
                            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                            <p className="text-sm text-gray-500 font-medium">{manageCountText(content.length)}</p>
                        </div>
                        <button 
                            onClick={() => openEditor(defaultNewRecord())} 
                            className="bg-gray-800 hover:bg-black text-white px-6 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 w-full md:w-auto"
                        >
                            <Plus size={18} /> {addNewText}
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    {columns.map((col, i) => (
                                        <th 
                                            key={i} 
                                            className={`py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500 ${col.className || ''}`}
                                        >
                                            {col.header}
                                        </th>
                                    ))}
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500 text-right min-w-[180px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content.map((item, idx) => (
                                    <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                        {renderRowCells(item)}
                                        <td className="py-4 pl-6 pr-8 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                {reorderEndpoint && (
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
                                                )}
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
                                        <td colSpan={columns.length + 1} className="py-16 text-center text-gray-400 font-medium text-sm">No records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <form id="tab-form" onSubmit={handleSave} className="max-w-3xl mx-auto py-4">
                    <div className="flex justify-start mb-4">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={14} /> Back
                        </button>
                    </div>

                    {draftAvailable && (
                        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border border-brand-gold/30 bg-brand-gold/[0.03] p-4 text-sm font-semibold text-brand-gold shadow-sm">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>We found an unsaved draft from a previous session.</span>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button 
                                    type="button" 
                                    onClick={handleRestoreDraft}
                                    className="bg-brand-gold text-white text-xs px-3 py-1.5 rounded font-bold hover:bg-brand-gold/90 transition-colors"
                                >
                                    Restore Draft
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleDiscardDraft}
                                    className="border border-brand-gold/30 text-brand-gold text-xs px-3 py-1.5 rounded font-bold hover:bg-brand-gold/5 transition-colors"
                                >
                                    Discard Draft
                                </button>
                            </div>
                        </div>
                    )}

                    <header ref={headerRef} className="mb-10 text-center border-b pb-8">
                        <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                            {formData.id ? 'Edit Entry' : 'Add New Entry'}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Use any fields you want. You can keep them empty, mix title, label + value, and text only, and arrange the content your own way.
                        </p>
                    </header>
                    <StickySaveBar 
                        formId="tab-form" 
                        saving={saving} 
                        onCancel={handleCancel}
                        saveLabel={formData.id ? 'Update Record' : 'Save Record'}
                        isDirty={JSON.stringify(formData) !== JSON.stringify(initialData)}
                    />
                    {saveError && (
                        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{saveError}</span>
                        </div>
                    )}
                    <div className="space-y-4">
                        {renderFormFields(formData, setFormData)}
                    </div>
                    <div className="lg:hidden flex flex-col sm:flex-row gap-3 mt-12 justify-center">
                        <button type="submit" disabled={saving} className={`bg-gray-900 hover:bg-black text-white px-10 py-3 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 sm:min-w-[200px] ${saving ? 'opacity-70 cursor-wait' : ''}`}>
                            <Save size={18} /> {saving ? 'Saving...' : formData.id ? 'Update Record' : 'Save Record'}
                        </button>
                        <button type="button" onClick={handleCancel} disabled={saving} className="px-10 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded font-bold text-sm text-gray-600 transition-all sm:min-w-[120px] disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
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

export default AdminCrudLayout;
