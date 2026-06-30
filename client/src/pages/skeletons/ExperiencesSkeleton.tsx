// @ts-nocheck
import React from 'react';
import Skeleton from '../../components/Skeleton';

const ExperiencesSkeleton = () => {
  return (
    <section className="py-16 md:py-24 bg-[#fcfaf7] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Work Experience Section */}
        <div className="text-center mb-16 space-y-4">
          <Skeleton variant="text" className="h-4 w-28 mx-auto" />
          <Skeleton variant="title" className="h-12 w-80 mx-auto" />
        </div>
        <div className="max-w-4xl mx-auto space-y-8 mb-24">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl flex flex-col md:flex-row items-center md:items-start gap-6 border border-gray-100">
              <Skeleton variant="circle" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex-shrink-0" />
              <div className="flex-1 w-full text-center md:text-left space-y-4">
                <Skeleton variant="title" className="h-6 w-1/2 mx-auto md:mx-0" />
                <Skeleton variant="text" className="h-4 w-1/4 mx-auto md:mx-0" />
                <Skeleton variant="text" className="h-4 w-1/3 mx-auto md:mx-0" />
                <div className="space-y-2 pt-2">
                  <Skeleton variant="text" className="h-4 w-full" />
                  <Skeleton variant="text" className="h-4 w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trainings / Workshops Section */}
        <div className="text-center mb-12 space-y-4">
          <Skeleton variant="text" className="h-4 w-28 mx-auto" />
          <Skeleton variant="title" className="h-10 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24 max-w-7xl mx-auto">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <Skeleton variant="circle" className="w-14 h-14 rounded-2xl flex-shrink-0 animate-pulse" />
              <div className="flex-1 w-full text-center sm:text-left space-y-3">
                <Skeleton variant="title" className="h-5 w-3/4 mx-auto sm:mx-0" />
                <Skeleton variant="text" className="h-4 w-1/2 mx-auto sm:mx-0" />
                <Skeleton variant="text" className="h-4 w-1/3 mx-auto sm:mx-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Skills Section */}
        <div className="text-center mb-12 space-y-4">
          <Skeleton variant="text" className="h-4 w-28 mx-auto" />
          <Skeleton variant="title" className="h-10 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl border border-gray-100 space-y-4">
              <Skeleton variant="title" className="h-6 w-1/2 mx-auto md:mx-0 border-b border-gray-100 pb-3" />
              <div className="flex flex-wrap justify-center md:justify-start gap-2.5 pt-2">
                {Array.from({ length: 6 }).map((_, si) => (
                  <Skeleton key={si} variant="text" className="h-8 w-20 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default ExperiencesSkeleton;
