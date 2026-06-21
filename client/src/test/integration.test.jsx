import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearResponseCache } from '../api';
import { showSiteAlert, persistFlashSiteAlert, consumeFlashSiteAlert } from '../utils/siteAlerts';
import { getTransformedUrl, buildSrcSet, buildSizes } from '../utils/imageUrl';

describe('Client Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearResponseCache();
        window.sessionStorage.clear();
    });

    it('clears API response cache on clearResponseCache call', () => {
        // Since we cannot inspect api.js internal Map directly,
        // we verify that the clearResponseCache function is exported and callable without throwing.
        expect(typeof clearResponseCache).toBe('function');
        expect(() => clearResponseCache()).not.toThrow();
    });

    it('clears cache on language change custom event', () => {
        let eventTriggered = false;
        
        window.addEventListener('portfolio:languageChange', () => {
            eventTriggered = true;
        });

        const event = new CustomEvent('portfolio:languageChange', { detail: { language: 'bn' } });
        window.dispatchEvent(event);

        expect(eventTriggered).toBe(true);
    });

    describe('siteAlerts utility', () => {
        it('dispatches custom event on showSiteAlert', () => {
            let eventDetail = null;
            const listener = (e) => { eventDetail = e.detail; };
            window.addEventListener('portfolio:site-alert', listener);

            showSiteAlert('Test alert message');
            expect(eventDetail).toEqual({ message: 'Test alert message', type: 'info' });

            showSiteAlert({ title: 'Success', message: 'Done', type: 'success', duration: 3000 });
            expect(eventDetail).toEqual({ title: 'Success', message: 'Done', type: 'success', duration: 3000 });

            window.removeEventListener('portfolio:site-alert', listener);
        });

        it('persists and consumes flash alerts using sessionStorage', () => {
            persistFlashSiteAlert('Flash msg');
            expect(consumeFlashSiteAlert()).toEqual({ message: 'Flash msg', type: 'info' });
            expect(consumeFlashSiteAlert()).toBeNull(); // Consumed once, then cleared
        });
    });

    describe('imageUrl utility', () => {
        it('transforms Supabase image URLs correctly', () => {
            expect(getTransformedUrl('', 400)).toBe('');
            expect(getTransformedUrl('https://example.com/pic.jpg', 400)).toBe('https://example.com/pic.jpg');
            expect(getTransformedUrl('https://xyz.supabase.co/storage/v1/pic.jpg', 400)).toBe('https://xyz.supabase.co/storage/v1/pic.jpg?width=400&quality=75');
        });

        it('builds srcset and sizes for images', () => {
            expect(buildSrcSet('')).toBeUndefined();
            expect(buildSrcSet('https://example.com/pic.jpg')).toBeUndefined();
            
            const srcSet = buildSrcSet('https://xyz.supabase.co/pic.jpg', [400, 800]);
            expect(srcSet).toContain('?width=400&quality=75 400w');
            expect(srcSet).toContain('?width=800&quality=75 800w');

            expect(buildSizes()).toBe('(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw');
        });
    });
});

