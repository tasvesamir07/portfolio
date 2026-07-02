import React from 'react';
import Skeleton from '../../components/Skeleton';

const AcademicsSkeleton = () => {
  return (
    <section className="py-16 md:py-24 bg-[#fcfaf7] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <Skeleton variant="text" className="h-4 w-24 mx-auto" />
          <Skeleton variant="title" className="h-12 w-64 mx-auto" />
        </div>
        <div className="max-w-4xl mx-auto space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 flex flex-col md:flex-row gap-6">
              <Skeleton variant="circle" className="w-16 h-16 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-4">
                <Skeleton variant="title" className="h-8 w-2/3" />
                <Skeleton variant="text" className="h-4 w-1/3" />
                <div className="space-y-2 pt-2">
                  <Skeleton variant="text" className="h-4 w-full" />
                  <Skeleton variant="text" className="h-4 w-4/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AcademicsSkeleton;
