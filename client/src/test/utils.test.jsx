import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
    TOKEN_STORAGE_KEY,
    SESSION_CHANGED_EVENT,
    getStoredToken,
    getTokenExpiryTime,
    isTokenExpired,
    storeSessionToken,
    clearSessionToken,
    expireSessionAndRedirect
} from '../utils/authSession';
import {
    isHTML,
    isContactLabel,
    looksLikeContact,
    toHref,
    splitContactValues,
    extractHighlights,
    extractBioBlocks
} from '../utils/aboutHelpers';
import { useTranslatedDataRows } from '../utils/useTranslatedDataRows';

// Mock translator
vi.mock('../i18n/translator', () => ({
    shouldRunLiveClientTranslation: vi.fn().mockReturnValue(true),
    translateText: vi.fn().mockImplementation((text) => Promise.resolve(`${text}_translated`)),
    translateHtml: vi.fn().mockImplementation((text) => Promise.resolve(`${text}_translated`))
}));

describe('Client Utility Modules Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
    });

    describe('authSession.js', () => {
        it('should get and store session token', () => {
            expect(getStoredToken()).toBe('');
            storeSessionToken('test-token');
            expect(getStoredToken()).toBe('test-token');
        });

        it('should clear session token', () => {
            storeSessionToken('token-to-clear');
            expect(getStoredToken()).toBe('token-to-clear');
            clearSessionToken();
            expect(getStoredToken()).toBe('');
        });

        it('should check if token is expired', () => {
            // Null or invalid token is expired
            expect(isTokenExpired(null)).toBe(true);
            expect(isTokenExpired('')).toBe(true);

            // Valid base64 payload representing exp
            // Payload needs to be a valid JWT format: header.payload.signature
            const futureExp = Math.floor(Date.now() / 1000) + 3600;
            const payloadObj = { exp: futureExp };
            const payloadEncoded = window.btoa(JSON.stringify(payloadObj));
            const dummyToken = `header.${payloadEncoded}.signature`;

            expect(isTokenExpired(dummyToken)).toBe(false);
            expect(getTokenExpiryTime(dummyToken)).toBe(futureExp * 1000);

            // Expired token
            const pastExp = Math.floor(Date.now() / 1000) - 3600;
            const pastPayloadEncoded = window.btoa(JSON.stringify({ exp: pastExp }));
            const expiredToken = `header.${pastPayloadEncoded}.signature`;
            expect(isTokenExpired(expiredToken)).toBe(true);
        });

        it('should dispatch session changed event', () => {
            let eventToken = null;
            window.addEventListener(SESSION_CHANGED_EVENT, (e) => {
                eventToken = e.detail.token;
            });

            storeSessionToken('my-new-token');
            expect(eventToken).toBe('my-new-token');
        });

        it('should expire session and redirect to /admin', () => {
            // Mock window.location.replace and window.location.pathname
            const originalLocation = window.location;
            delete window.location;
            window.location = {
                pathname: '/some-other-path',
                replace: vi.fn()
            };

            expireSessionAndRedirect({ showAlert: false });

            expect(window.location.replace).toHaveBeenCalledWith('/admin');
            expect(getStoredToken()).toBe('');

            window.location = originalLocation;
        });
    });

    describe('aboutHelpers.js', () => {
        it('isHTML detects html tags', () => {
            expect(isHTML('<p>hello</p>')).toBe(true);
            expect(isHTML('plain text')).toBe(false);
        });

        it('isContactLabel detects contact labels', () => {
            expect(isContactLabel('email')).toBe(true);
            expect(isContactLabel('Email')).toBe(true);
            expect(isContactLabel('이메일')).toBe(true);
            expect(isContactLabel('work website')).toBe(true);
            expect(isContactLabel('name')).toBe(false);
        });

        it('looksLikeContact checks structure', () => {
            expect(looksLikeContact('test@domain.com')).toBe(true);
            expect(looksLikeContact('https://xyz.com')).toBe(true);
            expect(looksLikeContact('some value')).toBe(false);
        });

        it('toHref formats urls/emails', () => {
            expect(toHref('')).toBe('#');
            expect(toHref('xyz@gmail.com')).toBe('mailto:xyz@gmail.com');
            expect(toHref('www.xyz.com')).toBe('https://www.xyz.com');
            expect(toHref('https://abc.com')).toBe('https://abc.com');
        });

        it('splitContactValues splits lists', () => {
            expect(splitContactValues('test@email.com, https://xyz.com')).toEqual(['test@email.com', 'https://xyz.com']);
            expect(splitContactValues('abc@email.com; def@email.com')).toEqual(['abc@email.com', 'def@email.com']);
        });

        it('extractHighlights parses JSON and HTML structures', () => {
            // Test plain content
            expect(extractHighlights('Line 1\nLine 2')).toEqual([
                { text: 'Line 1', linkedValues: [] },
                { text: 'Line 2', linkedValues: [] }
            ]);

            // Test JSON structure
            const jsonHighlights = JSON.stringify([
                { type: 'text', text: 'Some text' },
                { title: 'Email', value: 'samir@test.com' }
            ]);
            const highlights = extractHighlights(jsonHighlights);
            expect(highlights[0].text).toBe('Some text');
            expect(highlights[1].label).toBe('Email');
            expect(highlights[1].linkedValues).toEqual(['samir@test.com']);

            // Test HTML structure
            const htmlContent = '<ul><li>Bullet 1</li><li>Bullet 2 <a href="https://link.com">Link</a></li></ul>';
            const parsedHtml = extractHighlights(htmlContent);
            expect(parsedHtml[0].text).toBe('Bullet 1');
            expect(parsedHtml[1].text).toContain('Bullet 2');
            expect(parsedHtml[1].linkedValues).toEqual(['Link']);
        });

        it('extractBioBlocks parses paragraphs and lists', () => {
            // Plain text paragraphs
            expect(extractBioBlocks('P1\n\nP2')).toEqual([
                { type: 'paragraph', text: 'P1' },
                { type: 'paragraph', text: 'P2' }
            ]);

            // HTML paragraphs and lists
            const htmlContent = '<p>Bio Intro</p><ul><li>Skill A</li><li>Skill B</li></ul>';
            expect(extractBioBlocks(htmlContent)).toEqual([
                { type: 'paragraph', text: 'Bio Intro' },
                { type: 'ul', items: ['Skill A', 'Skill B'] }
            ]);
        });
    });

    describe('useTranslatedDataRows.js', () => {
        it('should translate fields on language change', async () => {
            const rows = [
                { id: '1', title: 'Developer', company: 'Google' }
            ];
            const fields = ['title', 'company'];

            const { result } = renderHook(() => useTranslatedDataRows(rows, fields, 'bn'));

            // Initial render should show originals
            expect(result.current).toEqual(rows);

            // Wait for translation promise resolution
            await waitFor(() => {
                expect(result.current).toEqual([
                    { id: '1', title: 'Developer_translated', company: 'Google_translated' }
                ]);
            });
        });
    });
});
