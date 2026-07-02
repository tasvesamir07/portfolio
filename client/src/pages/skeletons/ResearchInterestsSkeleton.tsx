import React from 'react';
import Skeleton from '../../components/Skeleton';

const ResearchInterestsSkeleton = () => {
  return (
    <section className="py-16 md:py-24 bg-[#fcfaf7] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <Skeleton variant="text" className="h-4 w-28 mx-auto" />
          <Skeleton variant="title" className="h-12 w-80 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 space-y-4">
              <Skeleton variant="circle" className="w-12 h-12 rounded-xl" />
              <Skeleton variant="title" className="h-6 w-3/4" />
              <div className="space-y-2">
                <Skeleton variant="text" className="h-4 w-full" />
                <Skeleton variant="text" className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResearchInterestsSkeleton;
