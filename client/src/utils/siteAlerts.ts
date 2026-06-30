import type { SiteAlertDetail } from '../types';

export const SITE_ALERT_EVENT = 'portfolio:site-alert';
const FLASH_ALERT_STORAGE_KEY = 'portfolio:flash-alert';

const normalizeInput = (input: string | Partial<SiteAlertDetail>): SiteAlertDetail => {
  if (typeof input === 'string') {
    return { message: input, type: 'info' };
  }
  return {
    title: input.title || '',
    message: input.message || '',
    type: input.type || 'info',
    duration: input.duration
  };
};

export const showSiteAlert = (input: string | Partial<SiteAlertDetail>): void => {
  if (typeof window === 'undefined') return;
  const detail = normalizeInput(input);
  window.dispatchEvent(new CustomEvent(SITE_ALERT_EVENT, { detail }));
};

export const persistFlashSiteAlert = (input: string | Partial<SiteAlertDetail>): void => {
  if (typeof window === 'undefined') return;
  const detail = normalizeInput(input);
  window.sessionStorage.setItem(FLASH_ALERT_STORAGE_KEY, JSON.stringify(detail));
};

export const consumeFlashSiteAlert = (): SiteAlertDetail | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(FLASH_ALERT_STORAGE_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(FLASH_ALERT_STORAGE_KEY);
  try {
    return JSON.parse(raw) as SiteAlertDetail;
  } catch {
    return null;
  }
};
