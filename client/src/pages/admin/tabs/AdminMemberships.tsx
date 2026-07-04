import React from 'react';
import {
    Field,
    decodeHtmlPreview,
    InlineFormatEditor
} from '../components/AdminSharedComponents';
import { AdminCrudLayout } from '../components/AdminCrudLayout';

const MEMBERSHIP_TYPES = [
    { value: 'society', label: 'Society Member' },
    { value: 'editorial_board', label: 'Journal Editorial Board' }
];

const AdminMemberships = () => {
    const prepareFormData = (record: any = {}) => ({
        ...record,
        membership_type: record.membership_type || 'society',
        name: record.name || '',
        url: record.url || '',
        position: record.position || ''
    });

    const preparePayloadData = (formData: any) => {
        if (formData.url) {
            try {
                new URL(formData.url);
            } catch {
                throw new Error('Please enter a valid URL (e.g. https://example.com).');
            }
        }

        return {
            membership_type: formData.membership_type || 'society',
            name: formData.name || '',
            url: formData.url || '',
            position: formData.position || ''
        };
    };

    const columns = [
        { header: 'Name' },
        { header: 'Type' },
        { header: 'Position' }
    ];

    const renderRowCells = (item: any) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {decodeHtmlPreview(item.name) || 'Unnamed'}
                </div>
            </td>
            <td className="py-4 px-6">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${item.membership_type === 'society' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}`}>
                    {item.membership_type === 'society' ? 'Society' : 'Editorial Board'}
                </span>
            </td>
            <td className="py-4 px-6 text-gray-600 font-medium">
                {item.position || '—'}
            </td>
        </>
    );

    const renderFormFields = (formData: any, setFormData: any) => (
        <div className="grid grid-cols-1 gap-6">
            <div className="border-b pb-4">
                <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">Membership Info</h3>
                <div className="grid grid-cols-1 gap-4">
                    <Field label="Type">
                        <select
                            className="input"
                            value={formData.membership_type || 'society'}
                            onChange={e => setFormData({...formData, membership_type: e.target.value})}
                        >
                            {MEMBERSHIP_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label={formData.membership_type === 'society' ? 'Society Name' : 'Journal Name'}>
                        <InlineFormatEditor value={formData.name || ''} onChange={val => setFormData({...formData, name: val})} />
                    </Field>
                    {(formData.membership_type === 'editorial_board') && (
                        <Field label="Position">
                            <InlineFormatEditor value={formData.position || ''} onChange={val => setFormData({...formData, position: val})} placeholder="e.g. Editor, Associate Editor" />
                        </Field>
                    )}
                </div>
            </div>

            <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3 uppercase tracking-wider">Link</h3>
                <div className="grid grid-cols-1 gap-4">
                    <Field label={formData.membership_type === 'society' ? 'Society URL' : 'Journal URL'}>
                        <input type="url" className="input" value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="e.g. https://example.com" />
                    </Field>
                </div>
            </div>
        </div>
    );

    return (
        <AdminCrudLayout
            title="Memberships"
            entityName="Membership"
            apiEndpoint="/memberships"
            reorderEndpoint="/reorder/memberships"
            autosaveKey="autosave_memberships_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
            prepareFormData={prepareFormData}
            preparePayloadData={preparePayloadData}
        />
    );
};

export default AdminMemberships;
