// @ts-nocheck
import React from 'react';
import Skeleton from '../../components/Skeleton';

const ResearchSkeleton = () => {
  return (
    <section className="py-16 md:py-24 bg-[#fcfaf7] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <Skeleton variant="text" className="h-4 w-24 mx-auto" />
          <Skeleton variant="title" className="h-12 w-64 mx-auto" />
        </div>
        <div className="space-y-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`bg-white rounded-3xl border border-gray-100 flex flex-col md:flex-row gap-8 overflow-hidden shadow-sm ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
              <Skeleton variant="image" className="w-full md:w-2/5 h-64 md:h-80 rounded-none flex-shrink-0" />
              <div className="p-8 flex-1 flex flex-col justify-center space-y-4">
                <Skeleton variant="text" className="h-4 w-32" />
                <Skeleton variant="title" className="h-8 w-5/6" />
                <div className="space-y-2 pt-2">
                  <Skeleton variant="text" className="h-4 w-full" />
                  <Skeleton variant="text" className="h-4 w-full" />
                  <Skeleton variant="text" className="h-4 w-4/5" />
                </div>
                <Skeleton variant="text" className="h-10 w-36 rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResearchSkeleton;
