import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle, XCircle } from 'lucide-react';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';

const Contact = () => {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [status, setStatus] = useState('idle'); // idle, sending, success, error
    const { t } = useI18n();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        try {
            await api.post('/messages', formData);
            setStatus('success');
            setFormData({ name: '', email: '', message: '' });
            setTimeout(() => setStatus('idle'), 5000);
        } catch (err) {
            console.error('Error sending message:', err);
            setStatus('error');
        }
    };

    return (
        <section id="contact" className="py-16 md:py-24 bg-[#fcfaf7]">
            <div className="max-w-3xl mx-auto px-6">
                <span className="text-brand-blue font-bold uppercase tracking-widest mb-4 block text-center text-sm">{t('contact.kicker')}</span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-10 md:mb-16 text-gray-900 tracking-tight">{t('contact.titleMain')} <span className="text-brand-gold font-black">{t('contact.titleAccent')}</span></h2>
                
                {status === 'success' ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-10 md:p-16 rounded-[2rem] md:rounded-[3rem] border-4 border-brand-gold/10 shadow-2xl shadow-brand-gold/10 text-center"
                    >
                        <CheckCircle size={80} className="mx-auto text-brand-gold mb-6 md:mb-8 stroke-[1.5]" />
                        <h3 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight uppercase">{t('contact.successTitle')}</h3>
                        <p className="text-lg md:text-xl text-gray-500 font-medium">{t('contact.successMessage')}</p>
                    </motion.div>
                ) : (
                    <motion.form 
                        onSubmit={handleSubmit}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white p-6 sm:p-10 md:p-16 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-6 md:gap-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            <div className="flex flex-col gap-2 text-left">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">{t('contact.nameLabel')}</label>
                                <input 
                                    type="text" 
                                    className="input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                    placeholder={t('contact.namePlaceholder')}
                                />
                            </div>
                            <div className="flex flex-col gap-2 text-left">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">{t('contact.emailLabel')}</label>
                                <input 
                                    type="email" 
                                    className="input"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    required
                                    placeholder={t('contact.emailPlaceholder')}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-left">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">{t('contact.messageLabel')}</label>
                            <textarea 
                                rows="6"
                                className="input min-h-[150px]"
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                                required
                                placeholder={t('contact.messagePlaceholder')}
                            ></textarea>
                        </div>

                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-red-600 font-bold justify-center bg-red-50 p-4 rounded border border-red-100 text-sm">
                                <XCircle size={18} /> {t('contact.error')}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={status === 'sending'}
                            className="btn-primary flex items-center justify-center gap-3 py-4 text-base w-full bg-[#0b3b75] hover:bg-[#0a2f5c] rounded-xl text-white shadow-lg transition-all active:scale-[0.98]"
                        >
                            {status === 'sending' ? (
                                <>
                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white/40 border-l-white"></div>
                                    <span>{t('contact.sending')}</span>
                                </>
                            ) : (
                                <>
                                    <Send size={20} className="mb-0.5" /> 
                                    <span>{t('contact.sendMessage')}</span>
                                </>
                            )}
                        </button>
                    </motion.form>
                )}
            </div>
        </section>
    );
};

export default Contact;
