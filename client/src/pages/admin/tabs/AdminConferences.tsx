import React from 'react';
import {
    Field,
    FileUploadField,
    decodeHtmlPreview,
    InlineFormatEditor
} from '../components/AdminSharedComponents';
import { AdminCrudLayout } from '../components/AdminCrudLayout';
import { RenderInlineHtml } from '../../../utils/htmlRenderer';

const AdminConferences = () => {
    const prepareFormData = (record: any = {}) => ({
        ...record,
        title: record.title || '',
        main_author: record.main_author || '',
        authors: record.authors || '',
        conference_date: record.conference_date || '',
        description: record.description || '',
        link_url: record.link_url || ''
    });

    const preparePayloadData = (formData: any) => {
        if (formData.link_url) {
            try {
                new URL(formData.link_url);
            } catch {
                throw new Error('Please enter a valid External Link URL (e.g. https://example.com).');
            }
        }

        return {
            title: formData.title || '',
            main_author: formData.main_author || '',
            authors: formData.authors || '',
            conference_date: formData.conference_date || '',
            description: formData.description || '',
            link_url: formData.link_url || ''
        };
    };

    const columns = [
        { header: 'Title' },
        { header: 'Date' },
        { header: 'Authors' }
    ];

    const renderRowCells = (item: any) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.title) || 'Untitled'}
                </div>
            </td>
            <td className="py-4 px-6 text-gray-600 font-medium">
                {item.conference_date || '—'}
            </td>
            <td className="py-4 px-6 text-gray-600 font-medium max-w-xs">
                <div className="truncate text-xs">
                    {item.main_author ? (
                        <><RenderInlineHtml html={item.main_author} />*{item.authors ? ', ' : ''}</>
                    ) : ''}
                    {item.authors ? <RenderInlineHtml html={item.authors} /> : ''}
                    {!item.main_author && !item.authors ? '—' : ''}
                </div>
            </td>
        </>
    );

    const renderFormFields = (formData: any, setFormData: any) => (
        <div className="grid grid-cols-1 gap-6">
            <div className="border-b pb-4">
                <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">English (Primary)</h3>
                <div className="grid grid-cols-1 gap-4">
                    <Field label="Title">
                        <InlineFormatEditor value={formData.title || ''} onChange={val => setFormData({...formData, title: val})} />
                    </Field>
                    <Field label="Main Author (bold with *)">
                        <InlineFormatEditor value={formData.main_author || ''} onChange={val => setFormData({...formData, main_author: val})} />
                    </Field>
                    <Field label="Co-authors">
                        <InlineFormatEditor value={formData.authors || ''} onChange={val => setFormData({...formData, authors: val})} />
                    </Field>
                    <Field label="Date">
                        <input type="text" className="input" value={formData.conference_date || ''} onChange={e => setFormData({...formData, conference_date: e.target.value})} placeholder="e.g. December 2025" />
                    </Field>
                    <Field label="Description">
                        <InlineFormatEditor value={formData.description || ''} onChange={val => setFormData({...formData, description: val})} />
                    </Field>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">Link</h3>
                <div className="grid grid-cols-1 gap-4">
                    <Field label="External Link (Proceedings / Conference Page)">
                        <input type="url" className="input" value={formData.link_url || ''} onChange={e => setFormData({...formData, link_url: e.target.value})} placeholder="e.g. https://example.com/proceedings" />
                    </Field>
                </div>
            </div>
        </div>
    );

    return (
        <AdminCrudLayout
            title="Available Conference Entries"
            entityName="Conference"
            apiEndpoint="/conferences"
            reorderEndpoint="/reorder/conferences"
            autosaveKey="autosave_conferences_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminConferences;
