import { persistFlashSiteAlert, showSiteAlert } from './siteAlerts';

export const TOKEN_STORAGE_KEY = 'samir_portfolio_token';
export const SESSION_CHANGED_EVENT = 'portfolio:session-changed';

let redirectInFlight = false;

const decodeJwtPayload = (token) => {
    if (!token || typeof token !== 'string') return null;

    try {
        const [, payload] = token.split('.');
        if (!payload) return null;

        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = window.atob(normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '='));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
};

export const getStoredToken = () => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
};

export const getTokenExpiryTime = (token) => {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return null;
    return Number(payload.exp) * 1000;
};

export const isTokenExpired = (token) => {
    const expiresAt = getTokenExpiryTime(token);
    if (!expiresAt) return true;
    return Date.now() >= expiresAt;
};

export const storeSessionToken = (token) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT, { detail: { token } }));
};

export const clearSessionToken = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT, { detail: { token: '' } }));
};

export const expireSessionAndRedirect = ({
    message = 'Your session has expired. Please log in again.',
    showAlert = true
} = {}) => {
    if (typeof window === 'undefined') return;
    if (redirectInFlight) return;

    redirectInFlight = true;
    clearSessionToken();

    if (showAlert) {
        const alertDetail = {
            type: 'error',
            title: 'Session Expired',
            message
        };
        showSiteAlert(alertDetail);
        persistFlashSiteAlert(alertDetail);
    }

    if (window.location.pathname !== '/admin') {
        window.location.replace('/admin');
        window.setTimeout(() => {
            redirectInFlight = false;
        }, 500);
        return;
    }

    window.setTimeout(() => {
        redirectInFlight = false;
    }, 500);
};
