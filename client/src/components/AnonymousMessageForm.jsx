import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import api from '../api';
import { useI18n } from '../i18n/I18nContext';

const AnonymousMessageForm = () => {
    const prefersReduced = useReducedMotion();
    const [message, setMessage] = useState('');
    const [website, setWebsite] = useState(''); // Honeypot field
    const [status, setStatus] = useState('idle'); // idle, sending, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const { t } = useI18n();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!message.trim()) {
            setErrorMessage('Message cannot be empty.');
            setStatus('error');
            return;
        }

        setStatus('sending');
        setErrorMessage('');
        try {
            // Send both message and the honeypot "website" field
            await api.post('/anonymous-messages', { message, website });
            setStatus('success');
            setMessage('');
            setTimeout(() => setStatus('idle'), 5000);
        } catch (err) {
            console.error('Error sending anonymous message:', err);
            setStatus('error');
            setErrorMessage(err.response?.data?.error || 'Failed to send message. Please try again.');
        }
    };

    return (
        <section className="py-16 md:py-24 bg-[#fcfaf7] min-h-[70vh] flex items-center">
            <div className="max-w-xl mx-auto px-6 w-full">
                <span className="text-[#0b3b75] font-bold uppercase tracking-widest mb-4 block text-center text-sm">
                    {t('anonymous.kicker') || 'Secure & Private'}
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-center mb-10 text-gray-900 tracking-tight leading-tight">
                    {t('anonymous.titleMain') || 'Send An'} <span className="text-[#ceb079] font-black">{t('anonymous.titleAccent') || 'Anonymous Message'}</span>
                </h2>
                
                {status === 'success' ? (
                    <motion.div 
                        role="status"
                        aria-live="polite"
                        {...(!prefersReduced ? {
                            initial: { opacity: 0, scale: 0.95 },
                            animate: { opacity: 1, scale: 1 }
                        } : {})}
                        className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-10 text-center hover-glow"
                    >
                        <CheckCircle size={72} className="mx-auto text-[#ceb079] mb-6 stroke-[1.5]" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-3 uppercase tracking-tight">
                            {t('anonymous.successTitle') || 'Message Sent'}
                        </h3>
                        <p className="text-gray-500 text-sm font-semibold leading-relaxed">
                            {t('anonymous.successMessage') || 'Your message has been sent successfully. It is completely anonymous and encrypted.'}
                        </p>
                    </motion.div>
                ) : (
                    <motion.form 
                        onSubmit={handleSubmit}
                        {...(!prefersReduced ? {
                            initial: { opacity: 0, y: 20 },
                            animate: { opacity: 1, y: 0 }
                        } : {})}
                        className="bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-xl flex flex-col gap-6 hover-glow"
                    >
                        <p className="text-xs text-gray-500 font-semibold text-center leading-relaxed">
                            {t('anonymous.formInstructions') || 'Write anything you want below. The recipient will see your message but no identifiers (no name, no email, no logging).'}
                        </p>

                        {/* Honeypot field - completely hidden to humans */}
                        <div style={{ display: 'none', position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                            <label htmlFor="website-confirm">Do not fill this if you are a human</label>
                            <input
                                id="website-confirm"
                                type="text"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                autoComplete="off"
                                tabIndex="-1"
                            />
                        </div>

                        <div className="flex flex-col gap-2 text-left">
                            <label htmlFor="anon-message-input" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">
                                {t('anonymous.messageLabel') || 'Your Message'}
                            </label>
                            <textarea 
                                id="anon-message-input"
                                rows="6"
                                className="input min-h-[160px] resize-none"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                                placeholder={t('anonymous.messagePlaceholder') || 'Type your message here...'}
                                aria-required="true"
                            ></textarea>
                        </div>

                        {status === 'error' && (
                            <div role="alert" aria-live="assertive" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={status === 'sending'}
                            className="flex items-center justify-center gap-2.5 h-12 bg-[#0b3b75] hover:bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                        >
                            {status === 'sending' ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white" />
                                    <span>{t('anonymous.sending') || 'Sending...'}</span>
                                </>
                            ) : (
                                <>
                                    <Send size={15} /> 
                                    <span>{t('anonymous.sendMessage') || 'Send Anonymously'}</span>
                                </>
                            )}
                        </button>
                    </motion.form>
                )}
            </div>
        </section>
    );
};

export default AnonymousMessageForm;
