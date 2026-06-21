import React from 'react';
import {
    Field,
    FileUploadField,
    StructuredItemsEditor,
    decodeHtmlPreview,
    InlineFormatEditor
} from '../components/AdminSharedComponents';
import {
    parseStructuredItems,
    serializeStructuredItems,
    buildStructuredPreview
} from '../../../utils/structuredItems';
import AdminCrudLayout from '../components/AdminCrudLayout';

const AdminPublications = () => {
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

    const prepareFormData = (record = {}) => {
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

    const preparePayloadData = (formData) => {
        if (!formData.title?.trim()) {
            throw new Error('Publication Title is required.');
        }

        if (!formData.pub_year?.trim()) {
            throw new Error('Publication Year is required.');
        }

        const validateUrl = (url, fieldName) => {
            if (!url) return;
            try {
                new URL(url);
            } catch {
                throw new Error(`Please enter a valid URL for ${fieldName} (e.g. https://example.com).`);
            }
        };

        validateUrl(formData.doi_url, 'DOI URL');
        validateUrl(formData.journal_url, 'Journal URL');
        validateUrl(formData.link_url, 'External Link');

        const structuredItems = formData.structured_items || [];
        const payload = {
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
            journal_url: formData.journal_url || '',
            doi: formData.doi || ''
        };
        delete payload.structured_items;
        return payload;
    };

    const getAdminDetailsPreview = (item = {}) => {
        const structuredPreview = buildStructuredPreview(item.details_json || '');
        return structuredPreview || item.introduction || item.methods || item.journal_name || 'No details';
    };

    const columns = [
        { header: 'Publication Title' },
        { header: 'Details', className: 'max-w-md' }
    ];

    const renderRowCells = (item) => (
        <>
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
        </>
    );

    const renderFormFields = (formData, setFormData) => (
        <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Publication Title">
                    <InlineFormatEditor value={formData.title || ''} onChange={val => setFormData({...formData, title: val})} required />
                </Field>
                <Field label="Journal / Conference Name">
                    <InlineFormatEditor value={formData.journal_name || ''} onChange={val => setFormData({...formData, journal_name: val})} />
                </Field>
                <Field label="Publication Year">
                    <InlineFormatEditor value={formData.pub_year || ''} onChange={val => setFormData({...formData, pub_year: val})} required />
                </Field>
                <Field label="Authors (Separate with commas)">
                    <InlineFormatEditor value={formData.authors || ''} onChange={val => setFormData({...formData, authors: val})} />
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

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Field label="DOI Number (Optional)">
                     <input type="text" className="input" value={formData.doi || ''} onChange={e => setFormData({...formData, doi: e.target.value})} placeholder="e.g. 10.xxxx/xxxxx" />
                 </Field>
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
    );

    return (
        <AdminCrudLayout
            title="Available Entries"
            entityName="Publication"
            apiEndpoint="/publications"
            reorderEndpoint="/reorder/publications"
            autosaveKey="autosave_publications_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminPublications;
