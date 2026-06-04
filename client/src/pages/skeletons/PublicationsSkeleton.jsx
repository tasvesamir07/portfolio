import React from 'react';
import Skeleton from '../../components/Skeleton';

const PublicationsSkeleton = () => {
  return (
    <section className="py-16 md:py-24 bg-[#fcfaf7] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <Skeleton variant="text" className="h-4 w-28 mx-auto" />
          <Skeleton variant="title" className="h-12 w-80 mx-auto" />
        </div>
        <div className="space-y-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 flex flex-col lg:flex-row gap-8">
              <Skeleton variant="image" className="w-full lg:w-80 h-48 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-6">
                <Skeleton variant="title" className="h-10 w-5/6" />
                <div className="space-y-3">
                  <Skeleton variant="text" className="h-4 w-full" />
                  <Skeleton variant="text" className="h-4 w-4/5" />
                  <Skeleton variant="text" className="h-4 w-3/4" />
                </div>
                <div className="flex gap-4 pt-4">
                  <Skeleton variant="text" className="h-10 w-32 rounded-lg" />
                  <Skeleton variant="text" className="h-10 w-32 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PublicationsSkeleton;
