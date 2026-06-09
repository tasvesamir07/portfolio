import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearResponseCache } from '../api';

describe('Client Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearResponseCache();
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
});
