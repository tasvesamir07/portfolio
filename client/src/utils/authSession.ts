import { persistFlashSiteAlert, showSiteAlert } from './siteAlerts';
import type { SiteAlertDetail } from '../types';

export const TOKEN_STORAGE_KEY = 'samir_portfolio_token';
export const SESSION_CHANGED_EVENT = 'portfolio:session-changed';

let redirectInFlight = false;

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

const decodeJwtPayload = (token: string): JwtPayload | null => {
  if (!token || typeof token !== 'string') return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '='));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
};

export const getStoredToken = (): string => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
};

export const getTokenExpiryTime = (token: string): number | null => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return Number(payload.exp) * 1000;
};

export const isTokenExpired = (token: string): boolean => {
  const expiresAt = getTokenExpiryTime(token);
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
};

export const storeSessionToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT, { detail: { token } }));
};

export const clearSessionToken = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT, { detail: { token: '' } }));
};

interface ExpireOptions {
  message?: string;
  showAlert?: boolean;
}

export const expireSessionAndRedirect = ({
  message = 'Your session has expired. Please log in again.',
  showAlert = true
}: ExpireOptions = {}): void => {
  if (typeof window === 'undefined') return;
  if (redirectInFlight) return;

  redirectInFlight = true;
  clearSessionToken();

  if (showAlert) {
    const alertDetail: SiteAlertDetail = {
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
