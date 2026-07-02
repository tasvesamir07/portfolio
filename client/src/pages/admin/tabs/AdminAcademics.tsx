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

const AdminAcademics = () => {
    const buildLegacyStructuredItems = (record: any = {}) => {
        const items = [];
        const timeline = [record.start_year, record.end_year].filter(Boolean).join(' - ');

        if (record.degree) {
            items.push({
                id: `${Date.now()}-degree`,
                type: 'title',
                title: record.degree,
                values: [''],
                text: ''
            });
        }
        if (timeline) {
            items.push({
                id: `${Date.now()}-timeline`,
                type: 'pair',
                title: 'Timeline',
                values: [timeline],
                text: ''
            });
        }
        if (record.institution) {
            items.push({
                id: `${Date.now()}-institution`,
                type: 'text',
                title: '',
                values: [''],
                text: record.institution
            });
        }
        return items;
    };

    const prepareFormData = (record: any = {}) => {
        const hasSavedStructuredJson =
            typeof record.details_json === 'string' && record.details_json.trim().startsWith('[');

        let structuredItems: any[] = parseStructuredItems(record.details_json || '');
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
            institution: formData.institution || '',
            degree: formData.degree || '',
            start_year: formData.start_year || '',
            end_year: formData.end_year || ''
        };
        delete payload.structured_items;
        return payload;
    };

    const getAdminDetailsPreview = (item: any = {}) => {
        const structuredPreview = buildStructuredPreview(item.details_json || '');
        return structuredPreview || item.details || item.degree || 'No details';
    };

    const columns = [
        { header: 'Record Info' },
        { header: 'Details', className: 'max-w-md' }
    ];

    const renderRowCells = (item: any) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.degree) || decodeHtmlPreview(item.institution) || 'Academic Qualification'}
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
            <Field label="Institution Name">
                <InlineFormatEditor value={formData.institution || ''} onChange={val => setFormData({...formData, institution: val})} />
            </Field>
            <Field label="Degree / Certificate">
                <InlineFormatEditor value={formData.degree || ''} onChange={val => setFormData({...formData, degree: val})} />
            </Field>
            <Field label="Start Year">
                <InlineFormatEditor value={formData.start_year || ''} onChange={val => setFormData({...formData, start_year: val})} />
            </Field>
            <Field label="End Year (or 'Present')">
                <InlineFormatEditor value={formData.end_year || ''} onChange={val => setFormData({...formData, end_year: val})} />
            </Field>
            <div className="md:col-span-2">
                <FileUploadField 
                    label="Institution Logo" 
                    value={formData.logo_url} 
                    onChange={url => setFormData({...formData, logo_url: url})} 
                />
            </div>
            <div className="md:col-span-2">
                <Field label="Academic Details">
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
            entityName="Academic"
            apiEndpoint="/academics"
            reorderEndpoint="/reorder/academics"
            autosaveKey="autosave_academics_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminAcademics;
