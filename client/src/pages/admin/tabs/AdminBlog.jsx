import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit3, Save, AlertCircle } from 'lucide-react';
import api, { clearResponseCache } from '../../../api';
import { clearTranslationCache } from '../../../i18n/translator';
import ConfirmModal from '../../../components/ConfirmModal';
import { showSiteAlert } from '../../../utils/siteAlerts';
import StickySaveBar from '../components/StickySaveBar';
import {
    Field,
    StructuredItemsEditor,
    decodeHtmlPreview,
    slugify
} from '../components/AdminSharedComponents';
import {
    parseStructuredItems,
    serializeStructuredItems,
    buildStructuredPreview
} from '../../../utils/structuredItems';

const AdminBlog = () => {
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
            const res = await api.get('/pages?includeContent=1');
            setContent(Array.isArray(res.data) ? res.data : [res.data]);
        } catch (err) {
            console.error('Error fetching blog pages:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const buildLegacyStructuredItems = (record = {}) => {
        if (!record.content) return [];
        return parseStructuredItems(record.content);
    };

    const prepareStructuredFormData = (record = {}) => {
        const hasSavedStructuredJson =
            typeof record.details_json === 'string' && record.details_json.trim().startsWith('[');

        let structuredItems = parseStructuredItems(record.details_json || '');
        if (!structuredItems.length && !hasSavedStructuredJson) {
            structuredItems = buildLegacyStructuredItems(record);
        }

        return {
            show_in_nav: true,
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
        setSaving(true);
        try {
            const structuredItems = formData.structured_items || [];
            const structuredPayload = {
                ...formData,
                details_json: serializeStructuredItems(structuredItems),
                title: formData.title || '',
                slug: slugify(formData.slug || formData.title || ''),
                show_in_nav: Boolean(formData.show_in_nav),
                content: formData.content || ''
            };
            delete structuredPayload.structured_items;

            if (formData.id) {
                await api.put(`/pages/${formData.id}`, structuredPayload);
            } else {
                await api.post('/pages', structuredPayload);
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
            'Are you sure you want to delete this page? This action cannot be undone.',
            async () => {
                try {
                    await api.delete(`/pages/${id}`);
                    clearTranslationCache();
                    clearResponseCache();
                    fetchData();
                    showSiteAlert({ type: 'success', message: 'Page deleted.' });
                } catch {
                    showSiteAlert({ type: 'error', message: 'Error deleting page.' });
                }
            }
        );
    };

    const getAdminDetailsPreview = (item = {}) => {
        const structuredPreview = buildStructuredPreview(item.details_json || '');
        return structuredPreview || item.content || item.slug || 'No details';
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
                            <Plus size={18} /> Add New Blog Page
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Page Title</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Details</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500 text-right min-w-[120px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content.map((item, idx) => (
                                    <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-gray-900 text-base leading-tight">
                                                {item.title || 'Untitled Page'}
                                            </div>
                                            <div className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase">
                                                Slug: /blog/{item.slug} {item.show_in_nav ? '(In Navbar)' : ''}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600 font-medium max-w-md">
                                            <div className="truncate text-xs">
                                                {decodeHtmlPreview(getAdminDetailsPreview(item))}
                                            </div>
                                        </td>
                                        <td className="py-4 pl-6 pr-8 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
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
                                        <td colSpan="3" className="py-16 text-center text-gray-400 font-medium text-sm">No pages found.</td>
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
                        <div className="grid grid-cols-1 gap-4">
                            <Field label="Page Title">
                                <input
                                    className="input"
                                    value={formData.title || ''}
                                    onChange={(e) => {
                                        const nextTitle = e.target.value;
                                        setFormData((prev) => ({
                                            ...prev,
                                            title: nextTitle,
                                            slug: !prev.id && (!prev.slug || prev.slug === slugify(prev.title || ''))
                                                ? slugify(nextTitle)
                                                : prev.slug
                                        }));
                                    }}
                                    placeholder="Example: Study"
                                />
                            </Field>
                            <Field label="Page Slug">
                                <input
                                    className="input"
                                    value={formData.slug || ''}
                                    onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                                    placeholder="study"
                                />
                                <p className="text-xs text-gray-500 mt-2">This page will open at `/blog/{formData.slug || 'your-slug'}`.</p>
                            </Field>
                            <Field label="Show In Blog Menu">
                                <label className="inline-flex items-center gap-3 text-sm font-semibold text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(formData.show_in_nav)}
                                        onChange={(e) => setFormData({ ...formData, show_in_nav: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-[#0b3b75] focus:ring-[#0b3b75]"
                                    />
                                    Show this page inside the navbar Blog dropdown
                                </label>
                            </Field>
                            <Field label="Page Content">
                                <StructuredItemsEditor
                                    items={formData.structured_items || []}
                                    onChange={(items) => setFormData({ ...formData, structured_items: items })}
                                    itemLabel="Section"
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

export default AdminBlog;
