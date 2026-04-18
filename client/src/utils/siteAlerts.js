export const SITE_ALERT_EVENT = 'portfolio:site-alert';
const FLASH_ALERT_STORAGE_KEY = 'portfolio:flash-alert';

export const showSiteAlert = (input) => {
    if (typeof window === 'undefined') return;

    const detail = typeof input === 'string'
        ? { message: input, type: 'info' }
        : {
            title: input?.title || '',
            message: input?.message || '',
            type: input?.type || 'info',
            duration: input?.duration
        };

    window.dispatchEvent(new CustomEvent(SITE_ALERT_EVENT, { detail }));
};

export const persistFlashSiteAlert = (input) => {
    if (typeof window === 'undefined') return;

    const detail = typeof input === 'string'
        ? { message: input, type: 'info' }
        : {
            title: input?.title || '',
            message: input?.message || '',
            type: input?.type || 'info',
            duration: input?.duration
        };

    window.sessionStorage.setItem(FLASH_ALERT_STORAGE_KEY, JSON.stringify(detail));
};

export const consumeFlashSiteAlert = () => {
    if (typeof window === 'undefined') return null;

    const raw = window.sessionStorage.getItem(FLASH_ALERT_STORAGE_KEY);
    if (!raw) return null;

    window.sessionStorage.removeItem(FLASH_ALERT_STORAGE_KEY);

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};
