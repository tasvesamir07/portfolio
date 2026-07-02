import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit3, Save, ArrowUp, ArrowDown, AlertCircle, X, ArrowLeft } from 'lucide-react';
import api, { clearResponseCache } from '../../../api';
import { clearTranslationCache } from '../../../i18n/translator';
import ConfirmModal from '../../../components/ConfirmModal';
import { showSiteAlert } from '../../../utils/siteAlerts';
import StickySaveBar from '../components/StickySaveBar';
import OptimizedImage from '../../../components/OptimizedImage';
import {
    Field,
    FileUploadField,
    GalleryBulkUploadField,
    uploadFileToMediaApi,
    formatUploadErrorMessage,
    decodeHtmlPreview,
    InlineFormatEditor
} from '../components/AdminSharedComponents';

const AdminGallery = () => {
    const [content, setContent] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [categories, setCategories] = useState<any[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, onConfirm: null, title: '', message: '', type: 'danger' });
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [initialData, setInitialData] = useState<any>({});
    const [draftAvailable, setDraftAvailable] = useState(false);
    const [draftData, setDraftData] = useState<any>(null);
    const autosaveKey = 'autosave_gallery_form';

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

    const headerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!saveError) return undefined;
        const timer = setTimeout(() => setSaveError(''), 5000);
        return () => clearTimeout(timer);
    }, [saveError]);

    const openConfirmModal = (title: string, message: string, onConfirm: any, type = 'danger') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, type });
    };

    const fetchCategories = async () => {
        try {
            const res = await api.get('/gallery-categories');
            setCategories(res.data);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/gallery');
            setContent(Array.isArray(res.data) ? res.data : [res.data]);
            await fetchCategories();
        } catch (err) {
            console.error('Error fetching gallery:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
             const res = await api.post('/gallery-categories', { name: newCategoryName });
             setCategories([...categories, res.data]);
             setNewCategoryName('');
             clearTranslationCache();
             clearResponseCache();
             showSiteAlert({ type: 'success', message: 'Category added successfully.' });
        } catch (err) {
             console.error('Error adding category:', err);
             showSiteAlert({ type: 'error', message: 'Failed to add category.' });
        }
    };

    const handleDeleteCategory = async (id: any) => {
        const category = categories.find((c: any) => c.id === id);
        openConfirmModal(
            'Delete Category?',
            `Are you sure you want to delete "${category?.name}"? This will ALSO delete all images assigned to this category. This action cannot be undone.`,
            async () => {
                try {
                    await api.delete(`/gallery-categories/${id}`);
                    setCategories(categories.filter((c: any) => c.id !== id));
                    clearTranslationCache();
                    clearResponseCache();
                    fetchData();
                } catch (err: any) {
                    console.error('Error deleting category:', err);
                    showSiteAlert({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to delete category.' });
                }
            }
        );
    };

    const openEditor = (record: any = {}) => {
        setFormData(record);
        setInitialData(record);
        setIsEditing(true);
        setSaveError('');

        // Check if there is an autosaved draft
        if (autosaveKey) {
            const saved = localStorage.getItem(autosaveKey);
            if (saved) {
                try {
                    const { formData: savedForm } = JSON.parse(saved);
                    // Only prompt if draft is different from the currently loaded entity
                    if (JSON.stringify(savedForm) !== JSON.stringify(record)) {
                        setDraftAvailable(true);
                        setDraftData(savedForm);
                    }
                } catch {
                    localStorage.removeItem(autosaveKey);
                }
            }
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveError('');
        setSaving(true);
        try {
            const hasQueuedGalleryFiles = Array.isArray(formData.gallery_files) && formData.gallery_files.length > 0;

            if (!formData.id && !hasQueuedGalleryFiles && !formData.image_url) {
                throw new Error('Please upload at least one gallery image before saving.');
            }

            if (!formData.id && hasQueuedGalleryFiles) {
                if (!formData.category) {
                    throw new Error('Please select a category before saving gallery images.');
                }

                const results: any[] = [];

                for (const file of formData.gallery_files as any[]) {
                    try {
                        const imageUrl = await uploadFileToMediaApi(file);
                        const payload = {
                            image_url: imageUrl,
                            caption: formData.caption || '',
                            category: formData.category || ''
                        };

                        await api.post('/gallery', payload);
                        results.push({ name: file.name, success: true });
                    } catch (fileError) {
                        results.push({
                            name: file.name,
                            success: false,
                            error: formatUploadErrorMessage(fileError)
                        });
                    }
                }

                const failedUploads = results.filter((item: any) => !item.success);
                const successfulCount = results.length - failedUploads.length;

                if (!successfulCount) {
                    throw new Error(failedUploads[0]?.error || 'No gallery images were uploaded.');
                }

                if (failedUploads.length) {
                    showSiteAlert({
                        type: 'success',
                        message: `${successfulCount} image${successfulCount === 1 ? '' : 's'} saved. ${failedUploads.length} failed.`
                    });
                    setSaveError(failedUploads.map((item: any) => `${item.name}: ${item.error}`).join(' '));
                } else {
                    if (autosaveKey) {
                        localStorage.removeItem(autosaveKey);
                    }
                    setDraftAvailable(false);
                    showSiteAlert({
                        type: 'success',
                        message: `${successfulCount} gallery image${successfulCount === 1 ? '' : 's'} saved successfully.`
                    });
                    setIsEditing(false);
                }
            } else {
                if (formData.id) {
                    await api.put(`/gallery/${formData.id}`, formData);
                } else {
                    await api.post('/gallery', formData);
                }
                if (autosaveKey) {
                    localStorage.removeItem(autosaveKey);
                }
                setDraftAvailable(false);
                setIsEditing(false);
                showSiteAlert({ type: 'success', message: 'Saved successfully.' });
            }

            clearTranslationCache();
            clearResponseCache();
            fetchData();
        } catch (err: any) {
            setSaveError(err.response?.data?.message || err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (autosaveKey) {
            localStorage.removeItem(autosaveKey);
        }
        setDraftAvailable(false);
        setIsEditing(false);
    };

    const handleDelete = async (id: any) => {
        openConfirmModal(
            'Confirm Deletion',
            'Are you sure you want to delete this record? This action cannot be undone.',
            async () => {
                try {
                    await api.delete(`/gallery/${id}`);
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

    const handleMove = async (index: number, direction: number) => {
        const newContent = [...content];
        const targetIndex = index + direction;
        
        if (targetIndex < 0 || targetIndex >= newContent.length) return;
        
        const temp = newContent[index];
        if (!temp) return;
        newContent[index] = newContent[targetIndex];
        newContent[targetIndex] = temp;
        
        setContent(newContent);
        
        const orders = newContent.map((item: any, idx: number) => ({
            id: item.id,
            sort_order: idx
        }));
        
        try {
            await api.put('/reorder/gallery', { orders });
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
                            <Plus size={18} /> Add to Gallery
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Image Caption</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Category</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500 text-right min-w-[180px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content.map((item: any, idx: number) => (
                                    <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                {item.image_url && (
                                                    <OptimizedImage 
                                                        src={item.image_url} 
                                                        alt="" 
                                                        className="w-10 h-10 object-cover rounded" 
                                                        width={40}
                                                        height={40}
                                                    />
                                                )}
                                                <div>
                                                    <div className="font-bold text-gray-900 text-base leading-tight">
                                                        {decodeHtmlPreview(item.caption) || 'Gallery Image'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600 font-medium max-w-md">
                                            <div className="text-xs">
                                                {item.category || 'Uncategorized'}
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
                                        <td colSpan={3} className="py-16 text-center text-gray-400 font-medium text-sm">No records found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-12 p-6 bg-gray-50 rounded border border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider text-left">Gallery Categories</h3>
                        </div>
                        <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                            <input 
                                className="input flex-1" 
                                placeholder="Add new category (e.g. Workshop)" 
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                            />
                            <button type="submit" className="bg-gray-800 text-white px-6 py-2 rounded font-bold hover:bg-black transition-all text-sm">
                                Add
                            </button>
                        </form>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat: any) => (
                                <div key={cat.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-gray-200 group">
                                    <span className="text-xs font-bold text-gray-700">{cat.name}</span>
                                    <button 
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        title="Delete Category"
                                        type="button"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
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
                                    onClick={() => {
                                        if (draftData) {
                                            const restored = { ...draftData };
                                            if (initialData?.id) restored.id = initialData.id;
                                            setFormData(restored);
                                            setDraftAvailable(false);
                                            showSiteAlert({ type: 'success', message: 'Restored unsaved draft.' });
                                        }
                                    }}
                                    className="bg-brand-gold text-white text-xs px-3 py-1.5 rounded font-bold hover:bg-brand-gold/90 transition-colors"
                                >
                                    Restore Draft
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        localStorage.removeItem(autosaveKey);
                                        setDraftAvailable(false);
                                        showSiteAlert({ type: 'info', message: 'Draft discarded.' });
                                    }}
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
                            Fill in the fields below to add image(s) to the gallery.
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
                        <div className="grid grid-cols-1 gap-4">
                            {!formData.id && (
                                <GalleryBulkUploadField
                                    files={formData.gallery_files || []}
                                    onChange={(files) => setFormData({ ...formData, gallery_files: files })}
                                    disabled={saving}
                                />
                            )}
                            <FileUploadField 
                                label={formData.id ? "Gallery Image" : "Single Gallery Image (Optional)"}
                                value={formData.image_url || ''} 
                                onChange={val => setFormData({...formData, image_url: val})} 
                            />
                            <Field label="Short Caption">
                                <InlineFormatEditor value={formData.caption || ''} onChange={val => setFormData({...formData, caption: val})} />
                            </Field>
                            <Field label="Category">
                                <select 
                                    className="input" 
                                    value={formData.category || ''} 
                                    onChange={e => setFormData({...formData, category: e.target.value})}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
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

export default AdminGallery;
