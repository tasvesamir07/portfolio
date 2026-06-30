// @ts-nocheck
import React from 'react';
import Skeleton from '../../components/Skeleton';

const HomeSkeleton = () => {
  return (
    <div className="bg-[#fcfaf7] min-h-screen">
      {/* Hero Section Skeleton */}
      <section className="py-20 md:py-32 max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="w-full lg:w-1/2 space-y-6">
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="title" className="h-14 w-full" />
            <Skeleton variant="title" className="h-10 w-2/3" />
            <div className="space-y-3 pt-4">
              <Skeleton variant="text" className="h-4 w-full" />
              <Skeleton variant="text" className="h-4 w-5/6" />
            </div>
          </div>
          <div className="w-64 h-64 md:w-80 md:h-80 rounded-full flex-shrink-0">
            <Skeleton variant="circle" className="w-full h-full" />
          </div>
        </div>
      </section>

      {/* About Section Skeleton */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12">
          <Skeleton variant="image" className="h-96 w-full max-w-[320px] rounded-lg animate-pulse bg-[#f3ece2]/70" />
          <div className="space-y-6">
            <Skeleton variant="title" className="h-8 w-48" />
            <div className="space-y-4 pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton variant="circle" className="w-4 h-4 rounded-sm" />
                  <Skeleton variant="text" className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeSkeleton;
