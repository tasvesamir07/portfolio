import React from 'react';
import {
    Field,
    FileUploadField,
    decodeHtmlPreview,
    InlineFormatEditor
} from '../components/AdminSharedComponents';
import { AdminCrudLayout } from '../components/AdminCrudLayout';

const MEMBER_TYPES = [
    { value: 'researcher', label: 'Researcher' },
    { value: 'student', label: 'Student' }
];

const AdminTeamMembers = () => {
    const prepareFormData = (record: any = {}) => ({
        ...record,
        name: record.name || '',
        photo_url: record.photo_url || '',
        research_area: record.research_area || '',
        phone: record.phone || '',
        email: record.email || '',
        academic_level: record.academic_level || '',
        member_type: record.member_type || 'researcher'
    });

    const preparePayloadData = (formData: any) => ({
        name: formData.name || '',
        photo_url: formData.photo_url || '',
        research_area: formData.research_area || '',
        phone: formData.phone || '',
        email: formData.email || '',
        academic_level: formData.academic_level || '',
        member_type: formData.member_type || 'researcher'
    });

    const columns = [
        { header: 'Name' },
        { header: 'Type' },
        { header: 'Research Area' }
    ];

    const renderRowCells = (item: any) => (
        <>
            <td className="py-4 px-6">
                <div className="flex items-center gap-3">
                    {item.photo_url && (
                        <img src={item.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    )}
                    <div className="font-bold text-gray-900 text-base leading-tight">
                        {decodeHtmlPreview(item.name) || 'Unnamed'}
                    </div>
                </div>
            </td>
            <td className="py-4 px-6">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${item.member_type === 'researcher' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {item.member_type || '—'}
                </span>
            </td>
            <td className="py-4 px-6 text-gray-600 font-medium max-w-xs">
                <div className="truncate text-xs">
                    {decodeHtmlPreview(item.research_area) || '—'}
                </div>
            </td>
        </>
    );

    const renderFormFields = (formData: any, setFormData: any) => (
        <div className="grid grid-cols-1 gap-6">
            <div className="border-b pb-4">
                <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">Basic Info</h3>
                <div className="grid grid-cols-1 gap-4">
                    <Field label="Name">
                        <InlineFormatEditor value={formData.name || ''} onChange={val => setFormData({...formData, name: val})} />
                    </Field>
                    <Field label="Member Type">
                        <select
                            className="input"
                            value={formData.member_type || 'researcher'}
                            onChange={e => setFormData({...formData, member_type: e.target.value})}
                        >
                            {MEMBER_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Academic Level">
                        <InlineFormatEditor value={formData.academic_level || ''} onChange={val => setFormData({...formData, academic_level: val})} placeholder="e.g. PhD, Postdoc, MS Student" />
                    </Field>
                    <Field label="Research Area">
                        <InlineFormatEditor value={formData.research_area || ''} onChange={val => setFormData({...formData, research_area: val})} />
                    </Field>
                </div>
            </div>

            <div className="border-b pb-4">
                <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">Contact</h3>
                <div className="grid grid-cols-1 gap-4">
                    <Field label="Email">
                        <input type="email" className="input" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
                    </Field>
                    <Field label="Phone">
                        <input type="text" className="input" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. +82-10-1234-5678" />
                    </Field>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">Photo</h3>
                <div className="grid grid-cols-1 gap-4">
                    <FileUploadField
                        label="Photo"
                        value={formData.photo_url || ''}
                        onChange={val => setFormData({...formData, photo_url: val})}
                        accept="image/*"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <AdminCrudLayout
            title="Team Members"
            entityName="Team Member"
            apiEndpoint="/team-members"
            reorderEndpoint="/reorder/team_members"
            autosaveKey="autosave_team_members_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminTeamMembers;
