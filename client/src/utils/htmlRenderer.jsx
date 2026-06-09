import React from 'react';

/**
 * Strips outer <p>...</p> tags from an HTML string for inline rendering.
 */
export const cleanHtmlInline = (html = '') => {
    if (!html) return '';
    let cleaned = html.trim();
    if (cleaned.startsWith('<p>') && cleaned.endsWith('</p>')) {
        const inner = cleaned.slice(3, -4);
        if (!inner.includes('<p>')) {
            cleaned = inner;
        }
    }
    return cleaned;
};

/**
 * Safely renders rich text as an inline HTML span.
 */
export const RenderInlineHtml = ({ html = '', className = '', ...props }) => {
    const cleaned = cleanHtmlInline(html);
    if (!cleaned) return null;
    return (
        <span 
            className={className} 
            dangerouslySetInnerHTML={{ __html: cleaned }} 
            {...props}
        />
    );
};
