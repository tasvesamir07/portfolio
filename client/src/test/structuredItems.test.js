import { describe, it, expect } from 'vitest';
import {
    createStructuredItem,
    normalizeStructuredText,
    escapeStructuredHtml,
    extractStructuredPlainText,
    sanitizeStructuredInlineHtml,
    parseStructuredItems,
    serializeStructuredItems,
    buildStructuredPreview,
    buildStructuredFallbackText
} from '../utils/structuredItems';

describe('Structured Items Utilities (structuredItems.js)', () => {
    describe('createStructuredItem', () => {
        it('should create a structured item with default fields', () => {
            const item = createStructuredItem();
            expect(item).toHaveProperty('id');
            expect(item.type).toBe('pair');
            expect(item.title).toBe('');
            expect(item.values).toEqual(['']);
            expect(item.text).toBe('');
        });

        it('should create an item with specific type', () => {
            const item = createStructuredItem('title');
            expect(item.type).toBe('title');
        });
    });

    describe('normalizeStructuredText', () => {
        it('should replace non-breaking spaces and trim whitespace', () => {
            expect(normalizeStructuredText('  hello\u00a0world  ')).toBe('hello world');
        });
    });

    describe('escapeStructuredHtml', () => {
        it('should escape HTML special characters', () => {
            expect(escapeStructuredHtml('<script>alert("hello")</script>')).toBe('&lt;script&gt;alert(&quot;hello&quot;)&lt;/script&gt;');
        });
    });

    describe('extractStructuredPlainText', () => {
        it('should decode basic entities and return plain text', () => {
            expect(extractStructuredPlainText('hello &amp; world')).toBe('hello & world');
            expect(extractStructuredPlainText('hello &nbsp; world')).toBe('hello world');
        });
    });

    describe('sanitizeStructuredInlineHtml', () => {
        it('should preserve allowed tags like span (with style), strong, em, br', () => {
            const raw = '<span style="color: red;">hello</span> <strong>world</strong>';
            // Since jsdom is configured, DOMParser is available
            expect(sanitizeStructuredInlineHtml(raw)).toBe('<span style="color: red;">hello</span> <strong>world</strong>');
        });

        it('should normalize and sanitize anchor tags', () => {
            const raw = '<a href="google.com">Visit google.com</a>';
            expect(sanitizeStructuredInlineHtml(raw)).toContain('<a href="https://google.com"');
        });
    });

    describe('parseStructuredItems', () => {
        it('should parse structured items from JSON array string', () => {
            const jsonStr = JSON.stringify([
                { id: '1', type: 'title', title: 'My Title' },
                { id: '2', type: 'text', text: 'Some text content' },
                { id: '3', type: 'pair', title: 'Age', values: ['25'] }
            ]);

            const items = parseStructuredItems(jsonStr);
            expect(items).toHaveLength(3);
            expect(items[0].title).toBe('My Title');
            expect(items[1].text).toBe('Some text content');
            expect(items[2].values).toEqual(['25']);
        });

        it('should parse legacy raw HTML content to structured list', () => {
            const legacyHtml = '<p>Supervisor: Dr. John</p><h4>Publications</h4><p>Details about publication</p>';
            const items = parseStructuredItems(legacyHtml);
            expect(items.length).toBeGreaterThan(0);
        });

        it('should return empty list on empty content', () => {
            expect(parseStructuredItems('')).toEqual([]);
            expect(parseStructuredItems(null)).toEqual([]);
        });

        it('should parse plain text content without html tags using fallback parser', () => {
            const content = 'Supervisor: Dr. John\n\nSome text content\nTitle line';
            const items = parseStructuredItems(content);
            expect(items).toHaveLength(2);
            expect(items[0].type).toBe('pair');
            expect(items[0].title).toBe('Supervisor');
            expect(items[0].values).toEqual(['Supervisor: Dr. John']);
            expect(items[1].type).toBe('text');
            expect(items[1].text).toBe('Some text content\nTitle line');
        });

        it('should handle JSON parse errors gracefully and use HTML fallback parser', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const result = parseStructuredItems('[{invalidJson: true}');
            expect(result).toBeDefined();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should parse ul list elements into structured items', () => {
            const html = '<ul><li>Supervisor: Dr. John</li><li>Publications</li></ul>';
            const items = parseStructuredItems(html);
            expect(items).toHaveLength(2);
            expect(items[0].title).toBe('Supervisor');
            expect(items[1].type).toBe('text');
        });

        it('should fallback to body parsing if blocks list is empty', () => {
            const htmlWithBodyText = '<span></span> Supervisor: Dr. John';
            const items = parseStructuredItems(htmlWithBodyText);
            expect(items).toHaveLength(1);
            expect(items[0].title).toBe('Supervisor');
        });
    });

    describe('serializeStructuredItems', () => {
        it('should serialize items back to a JSON array string', () => {
            const items = [
                { type: 'title', title: 'My Section' },
                { type: 'text', text: 'Paragraph' },
                { type: 'pair', title: 'Supervisor', values: ['Dr. John'] }
            ];
            const jsonStr = serializeStructuredItems(items);
            const parsed = JSON.parse(jsonStr);
            expect(parsed).toHaveLength(3);
            expect(parsed[0].title).toBe('My Section');
            expect(parsed[1].text).toBe('Paragraph');
            expect(parsed[2].values).toEqual(['Dr. John']);
        });
    });

    describe('buildStructuredPreview', () => {
        it('should build a preview string from content', () => {
            const content = JSON.stringify([
                { type: 'title', title: 'Header' },
                { type: 'text', text: 'Body Text' },
                { type: 'pair', title: 'Label', values: ['Val 1', 'Val 2'] }
            ]);
            const preview = buildStructuredPreview(content);
            expect(preview).toBe('Header Body Text Label: Val 1 | Val 2');
        });
    });

    describe('buildStructuredFallbackText', () => {
        it('should construct comma-separated fallback text from items list', () => {
            const items = [
                { type: 'title', title: 'Heading' },
                { type: 'text', text: 'Description text' },
                { type: 'pair', title: 'Key', values: ['Value A', 'Value B'] },
                { type: 'pair', title: 'OnlyTitle' }
            ];
            const fallback = buildStructuredFallbackText(items);
            expect(fallback).toBe('Heading, Description text, Value A, Value B, OnlyTitle');
        });
    });
});
