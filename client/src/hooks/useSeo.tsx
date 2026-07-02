import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
}

const stripHtml = (str: string): string => {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00A0/g, ' ').trim();
};

export const useSeo = ({ title, description, ogImage, ogType = 'website' }: SeoProps): void => {
  React.useEffect(() => {
    if (title) {
      document.title = stripHtml(title);
    }
  }, [title]);
};

import { useSiteIdentity } from './useSiteName';

export const SEO = ({ title, description, ogImage, ogType = 'website' }: SeoProps) => {
  const cleanTitle = title ? stripHtml(title) : '';
  const cleanDesc = description ? stripHtml(description) : '';
  
  // Safely default to site identity logoUrl if not provided
  let logoUrl = '';
  try {
    const identity = useSiteIdentity();
    logoUrl = identity.logoUrl || '';
  } catch (e) {
    // Fail silently if context is missing in some stories/tests
  }
  
  const finalOgImage = ogImage || logoUrl;
  const canonicalUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';

  return (
    <Helmet>
      {cleanTitle && <title>{cleanTitle}</title>}
      {cleanTitle && <meta property="og:title" content={cleanTitle} />}
      {cleanDesc && <meta name="description" content={cleanDesc} />}
      {cleanDesc && <meta property="og:description" content={cleanDesc} />}
      {finalOgImage && <meta property="og:image" content={finalOgImage} />}
      <meta property="og:type" content={ogType} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    </Helmet>
  );
};

export default SEO;
