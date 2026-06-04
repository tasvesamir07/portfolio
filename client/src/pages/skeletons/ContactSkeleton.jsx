import React from 'react';
import Skeleton from '../../components/Skeleton';

const ContactSkeleton = () => {
  return (
    <section className="py-16 md:py-24 bg-[#fcfaf7] min-h-[80vh]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <Skeleton variant="text" className="h-4 w-24 mx-auto" />
          <Skeleton variant="title" className="h-12 w-64 mx-auto" />
        </div>
        <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-gray-100 space-y-8 shadow-sm">
          <div className="space-y-3">
            <Skeleton variant="text" className="h-4 w-24" />
            <Skeleton variant="text" className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton variant="text" className="h-4 w-28" />
            <Skeleton variant="text" className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton variant="text" className="h-4 w-20" />
            <Skeleton variant="image" className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton variant="text" className="h-12 w-full rounded-xl mt-6" />
        </div>
      </div>
    </section>
  );
};

export default ContactSkeleton;
