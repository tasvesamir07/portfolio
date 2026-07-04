import React from 'react';
import {
    Field,
    decodeHtmlPreview,
    InlineFormatEditor
} from '../components/AdminSharedComponents';
import { AdminCrudLayout } from '../components/AdminCrudLayout';

const AdminProjects = () => {
    const prepareFormData = (record: any = {}) => ({
        ...record,
        title: record.title || '',
        funding_organization: record.funding_organization || '',
        duration: record.duration || ''
    });

    const preparePayloadData = (formData: any) => ({
        title: formData.title || '',
        funding_organization: formData.funding_organization || '',
        duration: formData.duration || ''
    });

    const columns = [
        { header: 'Title' },
        { header: 'Funding Org' },
        { header: 'Duration' }
    ];

    const renderRowCells = (item: any) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.title) || 'Untitled'}
                </div>
            </td>
            <td className="py-4 px-6 text-gray-600 font-medium">
                {decodeHtmlPreview(item.funding_organization) || '—'}
            </td>
            <td className="py-4 px-6 text-gray-600 font-medium">
                {item.duration || '—'}
            </td>
        </>
    );

    const renderFormFields = (formData: any, setFormData: any) => (
        <div className="grid grid-cols-1 gap-6">
            <div className="border-b pb-4">
                <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">Project Info</h3>
                <div className="grid grid-cols-1 gap-4">
                    <Field label="Project Title">
                        <InlineFormatEditor value={formData.title || ''} onChange={val => setFormData({...formData, title: val})} />
                    </Field>
                    <Field label="Funding Organization">
                        <InlineFormatEditor value={formData.funding_organization || ''} onChange={val => setFormData({...formData, funding_organization: val})} placeholder="e.g. National Research Foundation of Korea" />
                    </Field>
                    <Field label="Duration">
                        <input type="text" className="input" value={formData.duration || ''} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="e.g. 2024.03 – 2027.02" />
                    </Field>
                </div>
            </div>
        </div>
    );

    return (
        <AdminCrudLayout
            title="Research Projects"
            entityName="Project"
            apiEndpoint="/projects"
            reorderEndpoint="/reorder/projects"
            autosaveKey="autosave_projects_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminProjects;
