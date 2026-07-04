import React from 'react';
import {
    Field,
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

const AdminTrainings = () => {
    const buildLegacyStructuredItems = (record: any = {}) => {
        const items = [];

        if (record.title) {
            items.push({
                id: `${Date.now()}-training-title`,
                type: 'title',
                title: record.title,
                values: [''],
                text: ''
            });
        }
        if (record.topic) {
            items.push({
                id: `${Date.now()}-training-topic`,
                type: 'text',
                title: '',
                values: [''],
                text: record.topic
            });
        }
        if (record.date_text) {
            items.push({
                id: `${Date.now()}-training-date`,
                type: 'pair',
                title: 'Duration / Time',
                values: [record.date_text],
                text: ''
            });
        }
        if (record.instructor) {
            items.push({
                id: `${Date.now()}-training-instructor`,
                type: 'pair',
                title: 'Instructor / Organization',
                values: [record.instructor],
                text: ''
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
            title: formData.title || '',
            topic: formData.topic || '',
            date_text: formData.date_text || '',
            instructor: formData.instructor || ''
        };
        delete payload.structured_items;
        return payload;
    };

    const getAdminDetailsPreview = (item: any = {}) => {
        const structuredPreview = buildStructuredPreview(item.details_json || '');
        return structuredPreview || item.topic || 'No details';
    };

    const columns = [
        { header: 'Record Info' },
        { header: 'Details', className: 'max-w-md' }
    ];

    const renderRowCells = (item: any) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.title) || 'Training Record'}
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
            <Field label="Training / Workshop Title">
                <InlineFormatEditor value={formData.title || ''} onChange={val => setFormData({...formData, title: val})} />
            </Field>
            <Field label="Topic / Content">
                <InlineFormatEditor value={formData.topic || ''} onChange={val => setFormData({...formData, topic: val})} />
            </Field>
            <Field label="Duration / Time">
                <InlineFormatEditor value={formData.date_text || ''} onChange={val => setFormData({...formData, date_text: val})} />
            </Field>
            <Field label="Instructor / Organization">
                <InlineFormatEditor value={formData.instructor || ''} onChange={val => setFormData({...formData, instructor: val})} />
            </Field>
            <div className="md:col-span-2">
                <Field label="Training Details">
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
            entityName="Training"
            apiEndpoint="/trainings"
            reorderEndpoint="/reorder/trainings"
            autosaveKey="autosave_trainings_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminTrainings;
