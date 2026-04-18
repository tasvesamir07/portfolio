import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { consumeFlashSiteAlert, SITE_ALERT_EVENT, showSiteAlert } from '../utils/siteAlerts';

const SiteAlertContext = createContext({ showAlert: showSiteAlert });

const alertStyles = {
    success: {
        icon: CheckCircle2,
        wrapper: 'border-emerald-200 bg-white text-emerald-900 shadow-emerald-900/10',
        badge: 'bg-emerald-50 text-emerald-600'
    },
    error: {
        icon: AlertCircle,
        wrapper: 'border-red-200 bg-white text-red-900 shadow-red-900/10',
        badge: 'bg-red-50 text-red-600'
    },
    info: {
        icon: Info,
        wrapper: 'border-blue-200 bg-white text-blue-900 shadow-blue-900/10',
        badge: 'bg-blue-50 text-blue-600'
    }
};

export const SiteAlertProvider = ({ children }) => {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const handleAlert = (event) => {
            const detail = event.detail || {};
            const nextAlert = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                title: detail.title || '',
                message: detail.message || '',
                type: detail.type || 'info',
                duration: typeof detail.duration === 'number' ? detail.duration : 3200
            };

            setAlerts((current) => [...current.slice(-2), nextAlert]);
        };

        window.addEventListener(SITE_ALERT_EVENT, handleAlert);

        const originalAlert = window.alert;
        window.alert = (message) => {
            showSiteAlert({ message: String(message || ''), type: 'info' });
        };

        const flashAlert = consumeFlashSiteAlert();
        if (flashAlert?.message) {
            handleAlert({ detail: flashAlert });
        }

        return () => {
            window.removeEventListener(SITE_ALERT_EVENT, handleAlert);
            window.alert = originalAlert;
        };
    }, []);

    useEffect(() => {
        if (!alerts.length) return undefined;

        const timers = alerts.map((alert) => setTimeout(() => {
            setAlerts((current) => current.filter((item) => item.id !== alert.id));
        }, alert.duration));

        return () => timers.forEach(clearTimeout);
    }, [alerts]);

    const contextValue = useMemo(() => ({ showAlert: showSiteAlert }), []);

    return (
        <SiteAlertContext.Provider value={contextValue}>
            {children}
            <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-[min(92vw,24rem)] flex-col gap-3">
                <AnimatePresence>
                    {alerts.map((alert) => {
                        const style = alertStyles[alert.type] || alertStyles.info;
                        const Icon = style.icon;

                        return (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: 24, scale: 0.98 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 24, scale: 0.98 }}
                                className={`pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur ${style.wrapper}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 rounded-xl p-2 ${style.badge}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {alert.title && (
                                            <div className="mb-1 text-sm font-bold">{alert.title}</div>
                                        )}
                                        <div className="text-sm font-medium leading-relaxed text-gray-700">
                                            {alert.message}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAlerts((current) => current.filter((item) => item.id !== alert.id))}
                                        className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </SiteAlertContext.Provider>
    );
};

export const useSiteAlert = () => useContext(SiteAlertContext);
