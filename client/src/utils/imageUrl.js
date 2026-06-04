export const getTransformedUrl = (baseUrl, width, quality = 75) => {
  if (!baseUrl) return '';
  if (!baseUrl.includes('supabase.co')) return baseUrl;
  return `${baseUrl}?width=${width}&quality=${quality}&format=webp`;
};

export const buildSrcSet = (baseUrl, sizes = [400, 800, 1200]) => {
  if (!baseUrl || !baseUrl.includes('supabase.co')) return undefined;
  return sizes
    .map(w => `${baseUrl}?width=${w}&quality=${w <= 800 ? 75 : 80}&format=webp ${w}w`)
    .join(', ');
};

export const buildSizes = () => {
  return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
};
