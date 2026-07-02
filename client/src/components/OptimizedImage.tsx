// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { buildPictureProps } from '../utils/imageUrl';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  breakpoints?: number[];
  fetchpriority?: 'high' | 'auto' | 'low';
  loading?: 'lazy' | 'eager';
  className?: string;
  onError?: () => void;
  fallback?: React.ReactNode;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  sizes,
  breakpoints = [400, 800, 1200],
  fetchpriority = 'auto',
  loading = 'lazy',
  className = '',
  onError,
  fallback
}) => {
  const [isBroken, setIsBroken] = useState(false);

  useEffect(() => {
    setIsBroken(false);
  }, [src]);

  const handleOnError = () => {
    setIsBroken(true);
    if (onError) onError();
  };

  if (isBroken) {
    return fallback ? <>{fallback}</> : null;
  }

  const isSupabase = src && src.includes('supabase.co');

  if (!isSupabase) {
    return (
      <img
        src={src || ''}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        fetchpriority={fetchpriority}
        decoding="async"
        onError={handleOnError}
        className={className}
        style={{
          aspectRatio: `${width} / ${height}`,
          containIntrinsicSize: `${width}px ${height}px`
        }}
      />
    );
  }

  const { avifSrcSet, webpSrcSet, fallbackSrc } = buildPictureProps(src, width, breakpoints);

  return (
    <picture>
      {webpSrcSet && <source srcSet={webpSrcSet} type="image/webp" sizes={sizes} />}
      {avifSrcSet && <source srcSet={avifSrcSet} type="image/avif" sizes={sizes} />}
      <img
        src={fallbackSrc || ''}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        fetchpriority={fetchpriority}
        decoding="async"
        onError={handleOnError}
        className={className}
        style={{
          aspectRatio: `${width} / ${height}`,
          containIntrinsicSize: `${width}px ${height}px`
        }}
      />
    </picture>
  );
};

export default OptimizedImage;
