// @ts-nocheck
import React from 'react';

const Skeleton = ({ className = '', variant = 'text' }) => {
  const baseClass = "animate-pulse bg-[#f3ece2]/70 rounded-xl";
  
  let variantClass = "h-4 w-full"; // default 'text'
  if (variant === 'circle') {
    variantClass = "h-12 w-12 rounded-full";
  } else if (variant === 'card') {
    variantClass = "h-48 w-full rounded-2xl";
  } else if (variant === 'title') {
    variantClass = "h-8 w-3/4";
  } else if (variant === 'image') {
    variantClass = "h-64 w-full rounded-xl";
  }

  return (
    <div
      className={`${baseClass} ${variantClass} ${className}`}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
