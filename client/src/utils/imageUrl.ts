export const transformUrl = (
  baseUrl: string,
  width: number,
  format: 'webp' | 'avif',
  quality = 65
): string => {
  if (!baseUrl) return '';
  if (!baseUrl.includes('supabase.co')) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}width=${width}&quality=${quality}&format=${format}`;
};

export const getTransformedUrl = (baseUrl: string, width: number, quality = 65): string => {
  return transformUrl(baseUrl, width, 'webp', quality);
};

export const buildSrcSetForFormat = (
  baseUrl: string,
  format: 'webp' | 'avif',
  quality = 65,
  sizes = [400, 800, 1200]
): string | undefined => {
  if (!baseUrl || !baseUrl.includes('supabase.co')) return undefined;
  return sizes
    .map(w => {
      const q = w <= 400 ? quality + 5 : w >= 1200 ? quality - 5 : quality;
      return `${transformUrl(baseUrl, w, format, q)} ${w}w`;
    })
    .join(', ');
};

export const buildSrcSet = (baseUrl: string, sizes = [400, 800, 1200]): string | undefined => {
  return buildSrcSetForFormat(baseUrl, 'webp', 65, sizes);
};

export const buildSizes = (): string => {
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
};

export interface PictureProps {
  avifSrcSet?: string;
  webpSrcSet?: string;
  fallbackSrc: string;
}

export const buildPictureProps = (
  baseUrl: string,
  displayWidth: number,
  breakpoints = [400, 800, 1200]
): PictureProps => {
  if (!baseUrl) {
    return { fallbackSrc: '' };
  }
  if (!baseUrl.includes('supabase.co')) {
    return { fallbackSrc: baseUrl };
  }

  const avifSrcSet = buildSrcSetForFormat(baseUrl, 'avif', 65, breakpoints);
  const webpSrcSet = buildSrcSetForFormat(baseUrl, 'webp', 65, breakpoints);
  const fallbackSrc = transformUrl(baseUrl, displayWidth, 'webp', 65);

  return {
    avifSrcSet,
    webpSrcSet,
    fallbackSrc
  };
};
