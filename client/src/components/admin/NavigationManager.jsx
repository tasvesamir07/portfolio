import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ArrowUp, ArrowDown, Type, Link as LinkIcon, ChevronDown, ListTree, GripVertical } from 'lucide-react';
import api from '../../api';

const NavigationManager = () => {
    const [navLinks, setNavLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchNavLinks();
    }, []);

    const fetchNavLinks = async () => {
        try {
            setLoading(true);
            const res = await api.get('/about');
            if (res.data && res.data.custom_nav) {
                setNavLinks(res.data.custom_nav);
            } else {
                setNavLinks([]);
            }
        } catch (err) {
            console.error('Error fetching nav links:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage('');
            const res = await api.get('/about');
            const currentAbout = res.data;
            await api.put('/about', { ...currentAbout, custom_nav: navLinks });
            setMessage('Navigation menu saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Error saving nav links:', err);
            setMessage('Failed to save navigation menu.');
        } finally {
            setSaving(false);
        }
    };

    const moveItem = (index, direction, isSub, parentIndex = null) => {
        const newLinks = [...navLinks];
        if (isSub) {
            const items = newLinks[parentIndex].dropdownItems;
            if (direction === 'up' && index > 0) {
                [items[index - 1], items[index]] = [items[index], items[index - 1]];
            } else if (direction === 'down' && index < items.length - 1) {
                [items[index + 1], items[index]] = [items[index], items[index + 1]];
            }
        } else {
            if (direction === 'up' && index > 0) {
                [newLinks[index - 1], newLinks[index]] = [newLinks[index], newLinks[index - 1]];
            } else if (direction === 'down' && index < newLinks.length - 1) {
                [newLinks[index + 1], newLinks[index]] = [newLinks[index], newLinks[index + 1]];
            }
        }
        setNavLinks(newLinks);
    };

    const addTopLink = () => {
        setNavLinks([...navLinks, { id: Date.now(), name: 'New Link', path: '#section', isDropdown: false }]);
    };

    const addSubLink = (parentIndex) => {
        const newLinks = [...navLinks];
        if (!newLinks[parentIndex].dropdownItems) {
            newLinks[parentIndex].dropdownItems = [];
        }
        newLinks[parentIndex].dropdownItems.push({ id: Date.now(), name: 'New Sub Link', path: '#subsection' });
        setNavLinks(newLinks);
    };

    const removeTopLink = (index) => {
        const newLinks = [...navLinks];
        newLinks.splice(index, 1);
        setNavLinks(newLinks);
    };

    const removeSubLink = (parentIndex, subIndex) => {
        const newLinks = [...navLinks];
        newLinks[parentIndex].dropdownItems.splice(subIndex, 1);
        setNavLinks(newLinks);
    };

    const updateTopLink = (index, field, value) => {
        const newLinks = [...navLinks];
        newLinks[index][field] = value;
        setNavLinks(newLinks);
    };

    const updateSubLink = (parentIndex, subIndex, field, value) => {
        const newLinks = [...navLinks];
        newLinks[parentIndex].dropdownItems[subIndex][field] = value;
        setNavLinks(newLinks);
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-left">
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
                <div>
                    <h2 className="text-2xl font-bold text-[#0b3b75] uppercase tracking-tight flex items-center gap-3">
                        <ListTree size={28} className="text-[#ceb079]" />
                        Navigation Manager
                    </h2>
                    <p className="text-gray-500 mt-2 text-sm font-medium">Create and manage your website's main menu, including advanced dropdowns.</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="flex justify-center flex-row align-center shrink-0 items-center gap-2 bg-[#0b3b75] text-white px-6 py-3 rounded-lg hover:bg-black transition-colors font-bold uppercase tracking-wide text-sm"
                >
                    <Save size={18} /> {saving ? 'Saving...' : 'Save Navigation'}
                </button>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg font-medium text-sm border ${message.includes('success') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {message}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b3b75]"></div></div>
            ) : (
                <div className="space-y-4">
                    {navLinks.map((link, index) => (
                        <div key={link.id || index} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden transition-all hover:border-[#0b3b75]/30">
                            {/* Top Level Item Header */}
                            <div className="p-4 bg-white flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-gray-100">
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="flex flex-col gap-1 text-gray-400 p-1">
                                        <button onClick={() => moveItem(index, 'up', false)} disabled={index === 0} className="hover:text-[#0b3b75] disabled:opacity-30"><ArrowUp size={16} /></button>
                                        <button onClick={() => moveItem(index, 'down', false)} disabled={index === navLinks.length - 1} className="hover:text-[#0b3b75] disabled:opacity-30"><ArrowDown size={16} /></button>
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus-within:ring-2 ring-[#0b3b75]/20 focus-within:border-[#0b3b75] transition-all">
                                            <Type size={16} className="text-gray-400" />
                                            <input 
                                                type="text" 
                                                value={link.name} 
                                                onChange={(e) => updateTopLink(index, 'name', e.target.value)}
                                                className="bg-transparent border-none outline-none w-full text-sm font-bold text-gray-800"
                                                placeholder="Menu Label"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
                                    {/* Type Toggle */}
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600 bg-gray-100 p-1 rounded-lg">
                                        <button 
                                            onClick={() => updateTopLink(index, 'isDropdown', false)}
                                            className={`px-3 py-1.5 rounded-md transition-all ${!link.isDropdown ? 'bg-white shadow-sm text-[#0b3b75]' : 'hover:bg-gray-200 text-gray-500'}`}
                                        >
                                            Standard Link
                                        </button>
                                        <button 
                                            onClick={() => updateTopLink(index, 'isDropdown', true)}
                                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${link.isDropdown ? 'bg-white shadow-sm text-[#0b3b75]' : 'hover:bg-gray-200 text-gray-500'}`}
                                        >
                                            Dropdown <ChevronDown size={14} />
                                        </button>
                                    </div>

                                    {!link.isDropdown && (
                                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 focus-within:ring-2 ring-[#0b3b75]/20 focus-within:border-[#0b3b75] transition-all flex-1 min-w-[200px]">
                                            <LinkIcon size={16} className="text-gray-400" />
                                            <input 
                                                type="text" 
                                                value={link.path || ''} 
                                                onChange={(e) => updateTopLink(index, 'path', e.target.value)}
                                                className="bg-transparent border-none outline-none w-full text-sm text-gray-600 placeholder:text-gray-400"
                                                placeholder="/path or #hash"
                                            />
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => removeTopLink(index)}
                                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove Menu Item"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Dropdown Items Section */}
                            {link.isDropdown && (
                                <div className="p-4 pl-12 bg-gray-50 border-t border-gray-100">
                                    <div className="space-y-3">
                                        {(link.dropdownItems || []).map((subItem, subIndex) => (
                                            <div key={subItem.id || subIndex} className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                                <div className="flex flex-col gap-1 text-gray-400 pr-2 border-r border-gray-100">
                                                    <button onClick={() => moveItem(subIndex, 'up', true, index)} disabled={subIndex === 0} className="hover:text-[#0b3b75] disabled:opacity-30 p-0.5"><ArrowUp size={14} /></button>
                                                    <button onClick={() => moveItem(subIndex, 'down', true, index)} disabled={subIndex === (link.dropdownItems?.length || 0) - 1} className="hover:text-[#0b3b75] disabled:opacity-30 p-0.5"><ArrowDown size={14} /></button>
                                                </div>
                                                
                                                <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                                                    <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-1.5 focus-within:ring-2 ring-[#0b3b75]/20 focus-within:border-[#0b3b75] transition-all flex-1">
                                                        <input 
                                                            type="text" 
                                                            value={subItem.name} 
                                                            onChange={(e) => updateSubLink(index, subIndex, 'name', e.target.value)}
                                                            className="bg-transparent border-none outline-none w-full text-sm font-semibold text-gray-700"
                                                            placeholder="Sub-menu Label"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-1.5 focus-within:ring-2 ring-[#0b3b75]/20 focus-within:border-[#0b3b75] transition-all flex-1">
                                                        <LinkIcon size={14} className="text-gray-400" />
                                                        <input 
                                                            type="text" 
                                                            value={subItem.path || ''} 
                                                            onChange={(e) => updateSubLink(index, subIndex, 'path', e.target.value)}
                                                            className="bg-transparent border-none outline-none w-full text-sm text-gray-600"
                                                            placeholder="/path or #hash"
                                                        />
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => removeSubLink(index, subIndex)}
                                                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        <button 
                                            onClick={() => addSubLink(index)}
                                            className="flex items-center gap-2 text-sm font-bold text-[#0b3b75] hover:bg-[#0b3b75]/10 px-4 py-2 rounded-lg transition-all border border-dashed border-[#0b3b75]/30 w-full justify-center mt-4"
                                        >
                                            <Plus size={16} /> Add Sub-menu Item
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    <button 
                        onClick={addTopLink}
                        className="flex items-center gap-2 font-bold text-[#ceb079] hover:bg-[#ceb079]/10 px-6 py-4 rounded-xl transition-all border-2 border-dashed border-[#ceb079]/50 w-full justify-center mt-8 text-lg"
                    >
                        <Plus size={20} /> Add Top-Level Menu Item
                    </button>
                </div>
            )}
        </div>
    );
};

export default NavigationManager;
