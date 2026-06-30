// @ts-nocheck
import React from 'react';
import {
    Field,
    FileUploadField,
    StructuredItemsEditor,
    RichTextEditor,
    decodeHtmlPreview,
    normalizeAboutRichText,
    InlineFormatEditor
} from '../components/AdminSharedComponents';
import {
    parseStructuredItems,
    serializeStructuredItems,
    buildStructuredPreview
} from '../../../utils/structuredItems';
import AdminCrudLayout from '../components/AdminCrudLayout';

const AdminExperiences = () => {
    const buildLegacyStructuredItems = (record = {}) => {
        if (record.description) {
            return parseStructuredItems(record.description);
        }
        const items = [];
        const timeline = [record.start_date, record.end_date].filter(Boolean).join(' - ');
        if (record.position) {
            items.push({
                id: `${Date.now()}-position`,
                type: 'title',
                title: record.position,
                values: [''],
                text: ''
            });
        }
        if (timeline) {
            items.push({
                id: `${Date.now()}-exp-timeline`,
                type: 'pair',
                title: 'Timeline',
                values: [timeline],
                text: ''
            });
        }
        if (record.location) {
            items.push({
                id: `${Date.now()}-exp-location`,
                type: 'pair',
                title: 'Location',
                values: [record.location],
                text: ''
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
        const structuredItems = formData.structured_items || [];
        const payload = {
            ...formData,
            details_json: serializeStructuredItems(structuredItems),
            company: formData.company || '',
            position: formData.position || '',
            location: formData.location || '',
            start_date: formData.start_date || '',
            end_date: formData.end_date || '',
            description: normalizeAboutRichText(formData.description || '')
        };
        delete payload.structured_items;
        return payload;
    };

    const getAdminDetailsPreview = (item = {}) => {
        const structuredPreview = buildStructuredPreview(item.details_json || '');
        return structuredPreview || item.details || item.position || item.description || 'No details';
    };

    const columns = [
        { header: 'Record Info' },
        { header: 'Details', className: 'max-w-md' }
    ];

    const renderRowCells = (item) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.position) || 'Experience Record'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Company / Organization">
                <InlineFormatEditor value={formData.company || ''} onChange={val => setFormData({...formData, company: val})} />
            </Field>
            <Field label="Position Title">
                <InlineFormatEditor value={formData.position || ''} onChange={val => setFormData({...formData, position: val})} />
            </Field>
            <Field label="Location">
                <InlineFormatEditor value={formData.location || ''} onChange={val => setFormData({...formData, location: val})} />
            </Field>
            <Field label="Start Date (e.g. Jan 2023)">
                <InlineFormatEditor value={formData.start_date || ''} onChange={val => setFormData({...formData, start_date: val})} />
            </Field>
            <Field label="End Date (or 'Present')">
                <InlineFormatEditor value={formData.end_date || ''} onChange={val => setFormData({...formData, end_date: val})} />
            </Field>
            <div className="md:col-span-2 border-t pt-4 mt-2">
                 <FileUploadField 
                    label="Company Logo" 
                    value={formData.logo_url} 
                    onChange={url => setFormData({...formData, logo_url: url})} 
                />
            </div>
            <div className="md:col-span-2">
                <Field label="Experience Details">
                    <StructuredItemsEditor
                        items={formData.structured_items || []}
                        onChange={(items) => setFormData({ ...formData, structured_items: items })}
                        itemLabel="Detail"
                    />
                </Field>
            </div>
            <div className="md:col-span-2">
                <Field label="Legacy Description (Optional)">
                    <RichTextEditor
                        value={formData.description || ''}
                        onChange={val => setFormData(prev => ({...prev, description: val}))}
                    />
                </Field>
            </div>
        </div>
    );

    return (
        <AdminCrudLayout
            title="Available Entries"
            entityName="Experience"
            apiEndpoint="/experiences"
            reorderEndpoint="/reorder/experiences"
            autosaveKey="autosave_experiences_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminExperiences;
