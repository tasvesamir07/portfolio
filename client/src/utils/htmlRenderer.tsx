import React, { type HTMLAttributes } from 'react';

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
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: cleaned }}
      {...props}
    />
  );
};
