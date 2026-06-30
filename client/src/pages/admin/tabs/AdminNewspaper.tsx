// @ts-nocheck
import React from 'react';
import {
    Field,
    FileUploadField,
    decodeHtmlPreview,
    InlineFormatEditor
} from '../components/AdminSharedComponents';
import AdminCrudLayout from '../components/AdminCrudLayout';
import { RenderInlineHtml } from '../../../utils/htmlRenderer';

const AdminNewspaper = () => {
    const prepareFormData = (record = {}) => ({
        ...record,
        title: record.title || '',
        short_description: record.short_description || '',
        image_url: record.image_url || '',
        link_url: record.link_url || ''
    });

    const preparePayloadData = (formData) => {
        if (formData.link_url) {
            try {
                new URL(formData.link_url);
            } catch {
                throw new Error('Please enter a valid External Article Link URL (e.g. https://example.com).');
            }
        }

        return {
            title: formData.title || '',
            short_description: formData.short_description || '',
            image_url: formData.image_url || '',
            link_url: formData.link_url || ''
        };
    };

    const columns = [
        { header: 'Thumbnail' },
        { header: 'Title' },
        { header: 'Short Description' }
    ];

    const renderRowCells = (item) => (
        <>
            <td className="py-4 px-6">
                {item.image_url ? (
                    <img 
                        src={item.image_url} 
                        alt={decodeHtmlPreview(item.title)} 
                        className="w-12 h-12 object-cover rounded-md border border-gray-100" 
                    />
                ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 text-xs font-bold uppercase">No image</div>
                )}
            </td>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.title) || 'Untitled Article'}
                </div>
            </td>
            <td className="py-4 px-6 text-gray-600 font-medium max-w-xs md:max-w-md">
                <div className="truncate text-xs">
                    {decodeHtmlPreview(item.short_description || 'No description')}
                </div>
            </td>
        </>
    );

    const renderFormFields = (formData, setFormData) => (
        <div className="grid grid-cols-1 gap-6">
            <div className="border-b pb-4">
                <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">English (Primary)</h3>
                <div className="grid grid-cols-1 gap-4">
                    <Field label="Title">
                        <InlineFormatEditor value={formData.title || ''} onChange={val => setFormData({...formData, title: val})} />
                    </Field>
                    <Field label="Short Description">
                        <InlineFormatEditor value={formData.short_description || ''} onChange={val => setFormData({...formData, short_description: val})} />
                    </Field>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">Media & Link</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileUploadField 
                        label="Thumbnail Image" 
                        value={formData.image_url} 
                        onChange={url => setFormData({...formData, image_url: url})} 
                    />
                    <Field label="External Article Link">
                        <input type="url" className="input" value={formData.link_url || ''} onChange={e => setFormData({...formData, link_url: e.target.value})} placeholder="e.g. https://www.thedailystar.net/news" />
                    </Field>
                </div>
            </div>
        </div>
    );

    return (
        <AdminCrudLayout
            title="Available Newspaper Entries"
            entityName="Article"
            apiEndpoint="/newspapers"
            reorderEndpoint="/reorder/newspapers"
            autosaveKey="autosave_newspaper_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminNewspaper;
