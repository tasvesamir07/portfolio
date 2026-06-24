import React from 'react';
import { Briefcase, GraduationCap, FileText, Globe } from 'lucide-react';
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
import AdminCrudLayout from '../components/AdminCrudLayout';

const AdminResearchInterests = () => {
    const buildLegacyStructuredItems = (record = {}) => {
        if (!record.details) return [];
        return parseStructuredItems(record.details);
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
            interest: formData.interest || '',
            icon_name: formData.icon_name || 'FileText',
            details: formData.details || ''
        };
        delete payload.structured_items;
        return payload;
    };

    const getAdminDetailsPreview = (item = {}) => {
        const structuredPreview = buildStructuredPreview(item.details_json || '');
        return structuredPreview || item.details || item.interest || 'No details';
    };

    const columns = [
        { header: 'Interest Area' },
        { header: 'Details', className: 'max-w-md' }
    ];

    const renderRowCells = (item) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.interest) || 'Research Interest'}
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
            <Field label="Interest Area Title">
                <InlineFormatEditor value={formData.interest || ''} onChange={val => setFormData({...formData, interest: val})} />
            </Field>
            <Field label="Icon Selection">
                <div className="flex flex-wrap gap-2 mt-1">
                    {[
                        { name: 'Work', id: 'Briefcase', icon: Briefcase },
                        { name: 'Academic', id: 'GraduationCap', icon: GraduationCap },
                        { name: 'Research', id: 'FileText', icon: FileText },
                        { name: 'Global', id: 'Globe', icon: Globe }
                    ].map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setFormData({...formData, icon_name: item.id})}
                            className={`flex-1 flex flex-col items-center justify-center p-3 rounded border transition-all gap-1 min-w-[80px] ${formData.icon_name === item.id ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'}`}
                        >
                            <item.icon size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.name}</span>
                        </button>
                    ))}
                </div>
            </Field>
            <div className="md:col-span-2">
                <Field label="Interest Details">
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
            entityName="Research Interest"
            apiEndpoint="/research-interests"
            reorderEndpoint="/reorder/research_interests"
            autosaveKey="autosave_research_interests_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminResearchInterests;
