/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle, AlertCircle, Lock } from 'lucide-react';
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

    const handleSubmit = async (e: React.FormEvent) => {
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
        } catch (err: any) {
            console.error('Error sending anonymous message:', err);
            setStatus('error');
            setErrorMessage(err.response?.data?.error || 'Failed to send message. Please try again.');
        }
    };

    return (
        <section className="py-16 md:py-24 bg-[#fcfaf7] min-h-[70vh] flex items-center">
            <div className="max-w-3xl mx-auto px-6 w-full">
                <span className="text-brand-blue font-bold uppercase tracking-widest mb-4 block text-center text-sm">
                    {t('anonymous.kicker') || 'Secure & Private'}
                </span>
                <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold text-center mb-10 md:mb-16 text-gray-900 tracking-tight leading-tight">
                    {t('anonymous.titleMain') || 'Send An'} <span className="text-brand-gold font-black">{t('anonymous.titleAccent') || 'Anonymous Message'}</span>
                </h2>
                
                {status === 'success' ? (
                    <motion.div 
                        role="status"
                        aria-live="polite"
                        {...(!prefersReduced ? {
                            initial: { opacity: 0, scale: 0.9 },
                            animate: { opacity: 1, scale: 1 }
                        } : {})}
                        className="bg-white p-10 md:p-16 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm text-center hover-glow"
                    >
                        <CheckCircle size={80} className="mx-auto text-brand-gold mb-6 md:mb-8 stroke-[1.5]" />
                        <h3 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight uppercase">
                            {t('anonymous.successTitle') || 'Message Sent'}
                        </h3>
                        <p className="text-lg md:text-xl text-gray-500 font-medium">
                            {t('anonymous.successMessage') || 'Your message has been sent successfully. It is completely anonymous and encrypted.'}
                        </p>
                    </motion.div>
                ) : (
                    <motion.form 
                        onSubmit={handleSubmit}
                        {...(!prefersReduced ? {
                            initial: { opacity: 0, y: 30 },
                            whileInView: { opacity: 1, y: 0 },
                            viewport: { once: true }
                        } : {})}
                        className="bg-white p-6 sm:p-10 md:p-16 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-6 md:gap-8 hover-glow text-left"
                    >
                        {/* Security notice box */}
                        <div className="flex gap-4 items-start bg-brand-blue/5 border border-brand-blue/10 rounded-2xl p-5 text-brand-blue">
                            <Lock size={20} className="shrink-0 text-brand-gold mt-0.5" />
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-sm text-gray-900">Anonymity Guaranteed</span>
                                <span className="text-xs text-gray-500 font-medium leading-relaxed">
                                    {t('anonymous.formInstructions') || 'Write anything you want below. The recipient will see your message but no identifiers (no name, no email, no logging).'}
                                </span>
                            </div>
                        </div>

                        {/* Honeypot field - completely hidden to humans */}
                        <div style={{ display: 'none', position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                            <label htmlFor="website-confirm">Do not fill this if you are a human</label>
                            <input
                                id="website-confirm"
                                type="text"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                autoComplete="off"
                                tabIndex={-1}
                            />
                        </div>

                        <div className="flex flex-col gap-2 text-left">
                            <label htmlFor="anon-message-input" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                {t('anonymous.messageLabel') || 'Your Message'}
                            </label>
                            <textarea 
                                id="anon-message-input"
                                rows={6}
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
                            className="flex items-center justify-center gap-2.5 h-12 bg-brand-blue hover:bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer"
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

export default React.memo(AnonymousMessageForm);
