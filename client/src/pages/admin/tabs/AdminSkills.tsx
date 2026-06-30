// @ts-nocheck
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
    buildStructuredPreview,
    buildStructuredFallbackText
} from '../../../utils/structuredItems';
import AdminCrudLayout from '../components/AdminCrudLayout';

const AdminSkills = () => {
    const buildLegacyStructuredItems = (record = {}) => {
        if (!record.items) return [];
        return record.items
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value, index) => ({
                id: `${Date.now()}-skill-${index}`,
                type: 'text',
                title: '',
                values: [''],
                text: value
            }));
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
            category: formData.category || '',
            items: buildStructuredFallbackText(structuredItems) || formData.items || ''
        };
        delete payload.structured_items;
        return payload;
    };

    const getAdminDetailsPreview = (item = {}) => {
        const structuredPreview = buildStructuredPreview(item.details_json || '');
        return structuredPreview || item.items || item.category || 'No details';
    };

    const columns = [
        { header: 'Skill Category' },
        { header: 'Skills / Details', className: 'max-w-md' }
    ];

    const renderRowCells = (item) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.category) || 'Skill Category'}
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
        <div className="grid grid-cols-1 gap-4">
             <Field label="Skill Category (e.g. Programming Languages)">
                 <InlineFormatEditor value={formData.category || ''} onChange={val => setFormData({...formData, category: val})} />
             </Field>
            <Field label="Skill Details">
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
            entityName="Skill"
            apiEndpoint="/skills"
            reorderEndpoint="/reorder/skills"
            autosaveKey="autosave_skills_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminSkills;
