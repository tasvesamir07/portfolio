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
import { AdminCrudLayout } from '../components/AdminCrudLayout';

const AdminResearch = () => {
    const buildLegacyStructuredItems = (record: any = {}) => {
        if (!record.description) return [];
        return parseStructuredItems(record.description);
    };

    const prepareFormData = (record: any = {}) => {
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

    const preparePayloadData = (formData: any) => {
        const structuredItems = formData.structured_items || [];
        const payload = {
            ...formData,
            details_json: serializeStructuredItems(structuredItems),
            title: formData.title || '',
            status: formData.status || '',
            date_text: formData.date_text || '',
            link: formData.link || '',
            image_url: formData.image_url || '',
            file_url: formData.file_url || '',
            description: formData.description || ''
        };
        delete payload.structured_items;
        return payload;
    };

    const getAdminDetailsPreview = (item: any = {}) => {
        const structuredPreview = buildStructuredPreview(item.details_json || '');
        return structuredPreview || item.description || item.status || item.title || 'No details';
    };

    const columns = [
        { header: 'Project Title' },
        { header: 'Details', className: 'max-w-md' }
    ];

    const renderRowCells = (item: any) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.title) || 'Research Project'}
                </div>
            </td>
            <td className="py-4 px-6 text-gray-600 font-medium max-w-md">
                <div className="truncate text-xs">
                    {decodeHtmlPreview(getAdminDetailsPreview(item))}
                </div>
            </td>
        </>
    );

    const renderFormFields = (formData: any, setFormData: any) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Field label="Research Project Title">
                 <InlineFormatEditor value={formData.title || ''} onChange={val => setFormData({...formData, title: val})} />
             </Field>
             <Field label="Status / Phase (e.g. Ongoing, Completed)">
                 <InlineFormatEditor value={formData.status || ''} onChange={val => setFormData({...formData, status: val})} placeholder="Ongoing / Published / Case Study" />
             </Field>
             <Field label="Research Timeline / Date">
                 <InlineFormatEditor value={formData.date_text || ''} onChange={val => setFormData({...formData, date_text: val})} placeholder="Jan 2023 - Present" />
             </Field>
             <Field label="Project Link (Optional)">
                 <input className="input" value={formData.link || ''} onChange={e => setFormData({...formData, link: e.target.value})} />
             </Field>
             <div className="md:col-span-1">
                  <FileUploadField 
                     label="Project Image / Cover" 
                     value={formData.image_url} 
                     onChange={url => setFormData({...formData, image_url: url})} 
                 />
             </div>
             <div className="md:col-span-1">
                  <FileUploadField 
                     label="Full Paper (PDF)" 
                     value={formData.file_url} 
                     onChange={url => setFormData({...formData, file_url: url})} 
                     accept=".pdf"
                 />
             </div>
             <div className="md:col-span-2">
                 <Field label="Research Details">
                     <StructuredItemsEditor
                         items={formData.structured_items || []}
                         onChange={(items) => setFormData({ ...formData, structured_items: items })}
                         itemLabel="Detail"
                     />
                 </Field>
             </div>
        </div>
    );

    return (
        <AdminCrudLayout
            title="Available Entries"
            entityName="Research"
            apiEndpoint="/research"
            reorderEndpoint="/reorder/research"
            autosaveKey="autosave_research_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminResearch;
