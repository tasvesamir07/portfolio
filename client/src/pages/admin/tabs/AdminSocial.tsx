// @ts-nocheck
import React from 'react';
import {
    Field
} from '../components/AdminSharedComponents';
import { availableSocialPlatforms } from '../../../utils/socialIcons';
import AdminCrudLayout from '../components/AdminCrudLayout';

const AdminSocial = () => {
    const columns = [
        { header: 'Platform' },
        { header: 'Profile URL', className: 'max-w-md' }
    ];

    const renderRowCells = (item) => (
        <>
            <td className="py-4 px-6">
                <div className="font-bold text-gray-900 text-base leading-tight">
                    {item.platform || 'Social Link'}
                </div>
            </td>
            <td className="py-4 px-6 text-gray-600 font-medium max-w-md">
                <div className="truncate text-xs">
                    {item.url}
                </div>
            </td>
        </>
    );

    const renderFormFields = (formData, setFormData) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Platform Name">
                <input className="input" value={formData.platform || ''} onChange={e => setFormData({...formData, platform: e.target.value})} placeholder="e.g. GitHub" />
            </Field>
            <Field label="Icon Selection">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 mt-1 max-h-60 overflow-y-auto p-1 border border-gray-200 rounded-lg bg-gray-50/50">
                    {availableSocialPlatforms.map((platform) => {
                        const Icon = platform.icon;
                        const isSelected = (formData.icon_name || '').toLowerCase().replace(/[\s-_]/g, '') === platform.id;
                        return (
                            <button
                                key={platform.id}
                                type="button"
                                onClick={() => setFormData({ 
                                    ...formData, 
                                    icon_name: platform.id, 
                                    platform: platform.label,
                                    color_class: platform.colorClass 
                                })}
                                className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1.5 group ${isSelected ? 'border-[#0b3b75] bg-[#0b3b75]/5 text-[#0b3b75] font-bold shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                            >
                                <Icon size={22} style={{ color: platform.color }} className="transition-transform duration-200 group-hover:scale-110" />
                                <span className="text-[9px] font-bold uppercase whitespace-normal break-words w-full text-center text-gray-600 group-hover:text-gray-900 transition-colors leading-tight min-h-[20px] flex items-center justify-center">{platform.label}</span>
                            </button>
                        );
                    })}
                </div>
            </Field>
            <div className="md:col-span-2">
                <Field label="Full profile URL">
                    <input className="input" value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://..." />
                </Field>
            </div>
            <Field label="Color Theme">
                <select 
                    className="input" 
                    value={formData.color_class || ''} 
                    onChange={e => setFormData({...formData, color_class: e.target.value})}
                >
                    <option value="hover:text-gray-900">Default (Dark Gray)</option>
                    <option value="hover:text-blue-600">Blue (LinkedIn Style)</option>
                    <option value="hover:text-sky-500">Sky Blue (Twitter Style)</option>
                    <option value="hover:text-pink-600">Pink (Instagram Style)</option>
                    <option value="hover:text-brand-blue">Orange (Mail Style)</option>
                    <option value="hover:text-emerald-600">Emerald (Creative Style)</option>
                </select>
            </Field>
        </div>
    );

    return (
        <AdminCrudLayout
            title="Available Entries"
            entityName="Social Link"
            apiEndpoint="/social-links"
            reorderEndpoint="/reorder/social_links"
            autosaveKey="autosave_social_form"
            columns={columns}
            renderRowCells={renderRowCells}
            renderFormFields={renderFormFields}
        />
    );
};

export default AdminSocial;
