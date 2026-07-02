import React, { type HTMLAttributes } from 'react';
import DOMPurify from 'dompurify';

export const cleanHtmlInline = (html = ''): string => {
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

interface RenderInlineHtmlProps extends HTMLAttributes<HTMLSpanElement> {
  html?: string;
  className?: string;
}

export const RenderInlineHtml = ({ html = '', className = '', ...props }: RenderInlineHtmlProps) => {
  const cleaned = cleanHtmlInline(html);
  if (!cleaned) return null;
  
  const sanitized = DOMPurify.sanitize(cleaned);
  const withRel = sanitized.replace(
    /<a\s+(?=[^>]*target="_blank")[^>]*>/gi,
    (match) => {
      if (/rel\s*=/i.test(match)) return match;
      return match.replace('>', ' rel="noopener noreferrer">');
    }
  );

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: withRel }}
      {...props}
    />
  );
};
