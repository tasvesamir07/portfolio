// @ts-nocheck
import React from 'react';
import Skeleton from '../../components/Skeleton';

const GallerySkeleton = () => {
  return (
    <section className="py-16 md:py-24 bg-[#fcfaf7] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <Skeleton variant="text" className="h-4 w-24 mx-auto" />
          <Skeleton variant="title" className="h-12 w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="image"
              className={`rounded-[2rem] ${i % 3 === 0 ? 'h-72' : i % 3 === 1 ? 'h-56' : 'h-64'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default GallerySkeleton;
