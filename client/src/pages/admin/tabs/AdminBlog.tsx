import React from 'react';
import {
    Field,
    StructuredItemsEditor,
    decodeHtmlPreview,
    slugify,
    InlineFormatEditor
} from '../components/AdminSharedComponents';
import {
    parseStructuredItems,
    serializeStructuredItems,
    buildStructuredPreview
} from '../../../utils/structuredItems';
import { AdminCrudLayout } from '../components/AdminCrudLayout';

const AdminBlog = () => {
    const buildLegacyStructuredItems = (record: any = {}) => {
        if (!record.content) return [];
        return parseStructuredItems(record.content);
    };

    const prepareFormData = (record: any = {}) => {
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

    const preparePayloadData = (formData: any) => {
        const structuredItems = formData.structured_items || [];
        const payload = {
            ...formData,
            details_json: serializeStructuredItems(structuredItems),
            title: formData.title || '',
            slug: slugify(formData.slug || formData.title || ''),
            show_in_nav: Boolean(formData.show_in_nav),
            content: formData.content || ''
        };
        delete payload.structured_items;
        return payload;
    };

    const getAdminDetailsPreview = (item: any = {}) => {
        const structuredPreview = buildStructuredPreview(item.details_json || '');
        return structuredPreview || item.content || item.slug || 'No details';
    };

    const columns = [
        { header: 'Page Title' },
        { header: 'Details', className: 'max-w-md' }
    ];

    const renderRowCells = (item: any) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.title) || 'Untitled Page'}
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
        <div className="grid grid-cols-1 gap-4">
            <Field label="Page Title">
                <InlineFormatEditor
                    value={formData.title || ''}
                    onChange={(nextTitle) => {
                        setFormData((prev: any) => ({
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
    );

    return (
        <AdminCrudLayout
            title="Available Entries"
            entityName="Blog Page"
            apiEndpoint="/pages?includeContent=1"
            autosaveKey="autosave_blog_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminBlog;
