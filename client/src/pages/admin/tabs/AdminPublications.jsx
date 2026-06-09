import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit3, Save, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import api, { clearResponseCache } from '../../../api';
import { clearTranslationCache } from '../../../i18n/translator';
import ConfirmModal from '../../../components/ConfirmModal';
import { showSiteAlert } from '../../../utils/siteAlerts';
import StickySaveBar from '../components/StickySaveBar';
import {
    Field,
    FileUploadField,
    StructuredItemsEditor,
    decodeHtmlPreview
} from '../components/AdminSharedComponents';
import {
    parseStructuredItems,
    serializeStructuredItems,
    buildStructuredPreview
} from '../../../utils/structuredItems';

const AdminPublications = () => {
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '', type: 'danger' });
    const [notice, setNotice] = useState(null);
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);

    const headerRef = useRef(null);

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
            const res = await api.get('/publications');
            setContent(Array.isArray(res.data) ? res.data : [res.data]);
        } catch (err) {
            console.error('Error fetching publications:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const buildLegacyStructuredItems = (record = {}) => {
        const items = [];

        if (record.introduction) {
            items.push({
                id: `${Date.now()}-publication-introduction-title`,
                type: 'title',
                title: 'Introduction',
                values: [''],
                text: ''
            });

            parseStructuredItems(record.introduction).forEach((item, index) => {
                items.push({
                    ...item,
                    id: `${Date.now()}-publication-introduction-${index}`
                });
            });
        }

        if (record.methods) {
            items.push({
                id: `${Date.now()}-publication-methods-title`,
                type: 'title',
                title: 'Materials and Methods',
                values: [''],
                text: ''
            });

            parseStructuredItems(record.methods).forEach((item, index) => {
                items.push({
                    ...item,
                    id: `${Date.now()}-publication-methods-${index}`
                });
            });
        }

        return items;
    };

    const prepareStructuredFormData = (record = {}) => {
        const hasSavedStructuredJson =
            typeof record.details_json === 'string' && record.details_json.trim().startsWith('[');

        let structuredItems = parseStructuredItems(record.details_json || '');
        if (!structuredItems.length && !hasSavedStructuredJson) {
            structuredItems = buildLegacyStructuredItems(record);
        }

        return {
            ...record,
            structured_items: structuredItems
        };
    };

    const openEditor = (record = {}) => {
        setFormData(prepareStructuredFormData(record));
        setIsEditing(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaveError('');
        
        // Client-side Validation
        if (!formData.title?.trim()) {
            setSaveError('Publication Title is required.');
            return;
        }

        if (!formData.pub_year?.trim()) {
            setSaveError('Publication Year is required.');
            return;
        }

        const validateUrl = (url, fieldName) => {
            if (!url) return true;
            try {
                new URL(url);
                return true;
            } catch {
                setSaveError(`Please enter a valid URL for ${fieldName} (e.g. https://example.com).`);
                return false;
            }
        };

        if (!validateUrl(formData.doi_url, 'DOI URL')) return;
        if (!validateUrl(formData.journal_url, 'Journal URL')) return;
        if (!validateUrl(formData.link_url, 'External Link')) return;

        setSaving(true);
        try {
            const structuredItems = formData.structured_items || [];
            const structuredPayload = {
                ...formData,
                details_json: serializeStructuredItems(structuredItems),
                title: formData.title || '',
                thumbnail_url: formData.thumbnail_url || '',
                journal_name: formData.journal_name || '',
                pub_year: formData.pub_year || '',
                authors: formData.authors || '',
                link_url: formData.link_url || '',
                file_url: formData.file_url || '',
                introduction: formData.introduction || '',
                methods: formData.methods || '',
                doi_url: formData.doi_url || '',
                journal_url: formData.journal_url || ''
            };
            delete structuredPayload.structured_items;

            if (formData.id) {
                await api.put(`/publications/${formData.id}`, structuredPayload);
            } else {
                await api.post('/publications', structuredPayload);
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
            'Are you sure you want to delete this record? This action cannot be undone.',
            async () => {
                try {
                    await api.delete(`/publications/${id}`);
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
            await api.put('/reorder/publications', { orders });
            clearTranslationCache();
            clearResponseCache();
            fetchData();
        } catch (err) {
            console.error('Error reordering:', err);
            fetchData();
        }
    };

    const getAdminDetailsPreview = (item = {}) => {
        const structuredPreview = buildStructuredPreview(item.details_json || '');
        return structuredPreview || item.introduction || item.methods || item.journal_name || 'No details';
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
                            <Plus size={18} /> Add New Publication
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Publication Title</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Details</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500 text-right min-w-[180px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content.map((item, idx) => (
                                    <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-gray-900 text-base leading-tight">
                                                {item.title || 'Publication Record'}
                                            </div>
                                            <div className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase">
                                                {item.journal_name} ({item.pub_year || 'No year'})
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600 font-medium max-w-md">
                                            <div className="truncate text-xs">
                                                {decodeHtmlPreview(getAdminDetailsPreview(item))}
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
                <form id="tab-form" onSubmit={handleSave} className="max-w-3xl mx-auto py-4">
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
                        onCancel={() => setIsEditing(false)}
                        saveLabel={formData.id ? 'Update Record' : 'Save Record'}
                        headerRef={headerRef}
                    />
                    {saveError && (
                        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{saveError}</span>
                        </div>
                    )}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Publication Title">
                                    <input className="input" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
                                </Field>
                                <Field label="Journal / Conference Name">
                                    <input className="input" value={formData.journal_name || ''} onChange={e => setFormData({...formData, journal_name: e.target.value})} />
                                </Field>
                                <Field label="Publication Year">
                                    <input className="input" value={formData.pub_year || ''} onChange={e => setFormData({...formData, pub_year: e.target.value})} required />
                                </Field>
                                <Field label="Authors (Separate with commas)">
                                    <input className="input" value={formData.authors || ''} onChange={e => setFormData({...formData, authors: e.target.value})} />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                 <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                                     <label className="block text-[13px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                                         Cover Image Options
                                     </label>
                                     <div className="space-y-4">
                                         <input 
                                             type="text" 
                                             className="input" 
                                             placeholder="Paste custom cover image URL here..." 
                                             value={formData.thumbnail_url || ''} 
                                             onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} 
                                         />
                                         
                                         <FileUploadField 
                                             label="Or Upload Cover Image file" 
                                             value={formData.thumbnail_url} 
                                             onChange={url => setFormData({...formData, thumbnail_url: url})} 
                                         />
                                         
                                         <div>
                                             <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                                 Quick Journal Preset Covers
                                             </span>
                                             <div className="flex flex-wrap gap-2">
                                                 {[
                                                     { name: 'Medicinal Chem', url: 'https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&q=80&w=150' },
                                                     { name: 'PLoS One', url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&q=80&w=150' },
                                                     { name: 'IEEE', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=150' },
                                                     { name: 'Nature', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=150' },
                                                 ].map((preset, idx) => (
                                                     <button
                                                         key={idx}
                                                         type="button"
                                                         onClick={() => setFormData({...formData, thumbnail_url: preset.url})}
                                                         className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${formData.thumbnail_url === preset.url ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                     >
                                                         {preset.name}
                                                     </button>
                                                 ))}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                                 <FileUploadField 
                                     label="Full Publication PDF" 
                                     value={formData.file_url} 
                                     onChange={url => setFormData({...formData, file_url: url})} 
                                     accept=".pdf"
                                 />
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <Field label="DOI URL (Optional)">
                                     <input type="url" className="input" value={formData.doi_url || ''} onChange={e => setFormData({...formData, doi_url: e.target.value})} placeholder="e.g. https://doi.org/10.xxxx/xxxxx" />
                                 </Field>
                                 <Field label="Journal URL (Optional)">
                                     <input type="url" className="input" value={formData.journal_url || ''} onChange={e => setFormData({...formData, journal_url: e.target.value})} placeholder="e.g. https://journal-site.com" />
                                 </Field>
                             </div>

                             <Field label="External Link (Optional)">
                                 <input type="url" className="input" value={formData.link_url || ''} onChange={e => setFormData({...formData, link_url: e.target.value})} />
                             </Field>

                            <Field label="Publication Details">
                                <StructuredItemsEditor
                                    items={formData.structured_items || []}
                                    onChange={(items) => setFormData({ ...formData, structured_items: items })}
                                    itemLabel="Detail"
                                />
                            </Field>
                        </div>
                    </div>
                    <div className="lg:hidden flex flex-col sm:flex-row gap-3 mt-12 justify-center">
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

export default AdminPublications;
