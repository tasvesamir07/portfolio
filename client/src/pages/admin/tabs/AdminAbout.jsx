import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Save, AlertCircle, ArrowLeft } from 'lucide-react';
import api, { clearResponseCache } from '../../../api';
import { clearTranslationCache } from '../../../i18n/translator';
import StickySaveBar from '../components/StickySaveBar';
import { RenderInlineHtml } from '../../../utils/htmlRenderer';
import {
    Field,
    RichTextEditor,
    HighlightItemsEditor,
    FileUploadField,
    parseHighlightItems,
    serializeHighlightItems,
    normalizeAboutRichText,
    decodeHtmlPreview,
    InlineFormatEditor
} from '../components/AdminSharedComponents';

const AdminAbout = () => {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/about');
            const data = Array.isArray(res.data) ? res.data[0] : res.data;
            setContent(data || null);
        } catch (err) {
            console.error('Error fetching about data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const prepareAboutFormData = (about = {}) => ({
        ...about,
        name: about.name || '',
        site_name: about.site_name || '',
        title: about.title || '',
        location: about.location || '',
        bio_text: about.bio_text || '',
        highlight_items: parseHighlightItems(about.sub_bio || '')
    });

    const [initialData, setInitialData] = useState({});
    const [draftAvailable, setDraftAvailable] = useState(false);
    const [draftData, setDraftData] = useState(null);
    const autosaveKey = 'autosave_about_form';

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

    const openEditor = (about) => {
        const prepared = prepareAboutFormData(about);
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

    const handleSave = async (e) => {
        e.preventDefault();
        setSaveError('');
        setSaving(true);
        try {
            const aboutPayload = {
                ...formData,
                sub_bio: serializeHighlightItems(formData.highlight_items || []),
                bio_text: normalizeAboutRichText(formData.bio_text || ''),
            };
            delete aboutPayload.highlight_items;
            
            await api.put('/about', aboutPayload);
            
            // Clear draft
            if (autosaveKey) {
                localStorage.removeItem(autosaveKey);
            }
            setDraftAvailable(false);
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

    const handleCancel = () => {
        if (autosaveKey) {
            localStorage.removeItem(autosaveKey);
        }
        setDraftAvailable(false);
        setIsEditing(false);
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
                            <h2 className="text-xl font-bold text-gray-800">Biography Info</h2>
                            <p className="text-sm text-gray-500 font-medium">Currently managing biography records.</p>
                        </div>
                        <button 
                            onClick={() => openEditor(content || {})} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 w-full md:w-auto"
                        >
                            <Edit3 size={18} /> Edit Biography
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded border border-gray-200 shadow-sm">
                        <table className="w-full text-left border-collapse bg-white">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Record Info</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500">Details</th>
                                    <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-gray-500 text-right min-w-[120px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {content ? (
                                    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-gray-900 text-base leading-tight">
                                                {decodeHtmlPreview(content.name) || 'Biography'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600 font-medium max-w-md">
                                            <div className="truncate text-xs">
                                                {decodeHtmlPreview(content.bio_text)}
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
                                        <td colSpan="3" className="py-16 text-center text-gray-400 font-medium text-sm">No record found. Click Edit Biography to initialize.</td>
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
                                    onClick={() => {
                                        if (draftData) {
                                            setFormData(draftData);
                                            setDraftAvailable(false);
                                            setNotice({ type: 'success', message: 'Restored unsaved draft.' });
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
                                        setNotice({ type: 'info', message: 'Draft discarded.' });
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
                            Edit Entry
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Fill in the biography fields below. Fields marked with <span className="text-red-500">*</span> are mandatory.
                        </p>
                    </header>
                    <StickySaveBar 
                        formId="tab-form" 
                        saving={saving} 
                        onCancel={handleCancel}
                        saveLabel="Update Record"
                        isDirty={JSON.stringify(formData) !== JSON.stringify(initialData)}
                    />
                    {saveError && (
                        <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{saveError}</span>
                        </div>
                    )}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="md:col-span-2">
                                  <Field label="Full Name">
                                     <InlineFormatEditor value={formData.name || ''} onChange={val => setFormData({...formData, name: val})} />
                                 </Field>
                             </div>
                             <div className="md:col-span-2">
                                  <Field label="Portfolio Site Name">
                                     <InlineFormatEditor value={formData.site_name || ''} onChange={val => setFormData({...formData, site_name: val})} placeholder="e.g. My Portfolio" />
                                 </Field>
                             </div>
                             <div className="md:col-span-2">
                                 <FileUploadField 
                                     label="Website Logo (PNG/SVG)" 
                                     value={formData.logo_url || ''} 
                                     onChange={val => setFormData({...formData, logo_url: val})} 
                                     accept="image/*"
                                 />
                             </div>
                             <Field label="Professional Title">
                                 <InlineFormatEditor value={formData.title || ''} onChange={val => setFormData({...formData, title: val})} />
                             </Field>
                             <Field label="Location">
                                 <InlineFormatEditor value={formData.location || ''} onChange={val => setFormData({...formData, location: val})} />
                             </Field>
                             <div className="md:col-span-2">
                                 <FileUploadField 
                                     label="Upload Your CV (PDF/DOCX)" 
                                     value={formData.resume_url || ''} 
                                     onChange={val => setFormData({...formData, resume_url: val})} 
                                     accept=".pdf,.doc,.docx"
                                 />
                             </div>
                             <div className="md:col-span-2">
                                 <FileUploadField 
                                     label="Hero Image" 
                                     value={formData.hero_image_url || ''} 
                                     onChange={val => setFormData({...formData, hero_image_url: val})} 
                                     accept="image/*"
                                 />
                             </div>
                             <div className="md:col-span-2">
                                 <Field label="Short Hero Bio">
                                     <HighlightItemsEditor
                                         items={formData.highlight_items || []}
                                         onChange={(items) => setFormData({ ...formData, highlight_items: items })}
                                     />
                                 </Field>
                             </div>
                             <div className="md:col-span-2">
                                 <Field label="Detailed Biography">
                                     <RichTextEditor 
                                         value={formData.bio_text || ''} 
                                         onChange={val => setFormData(prev => ({...prev, bio_text: val}))} 
                                         className="bg-white h-64 mb-12"
                                     />
                                 </Field>
                             </div>
                         </div>
                     </div>
                    <div className="lg:hidden flex flex-col sm:flex-row gap-3 mt-12 justify-center">
                        <button type="submit" disabled={saving} className={`bg-gray-900 hover:bg-black text-white px-10 py-3 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 sm:min-w-[200px] ${saving ? 'opacity-70 cursor-wait' : ''}`}>
                            <Save size={18} /> {saving ? 'Saving...' : 'Update Record'}
                        </button>
                        <button type="button" onClick={handleCancel} disabled={saving} className="px-10 py-3 bg-white hover:bg-gray-50 border border-gray-300 rounded font-bold text-sm text-gray-600 transition-all sm:min-w-[120px] disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default AdminAbout;
