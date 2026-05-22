import React from 'react';

const SkeletonNewsCard = () => {
  return (
    <div className="block bg-white rounded-xl overflow-hidden shadow-md h-full animate-pulse select-none">
      {/* Container - maintains the exact dimensions of standard cards */}
      <div className="relative aspect-[4/5] sm:aspect-[4/3] md:aspect-[16/10] bg-gray-200 flex flex-col justify-between p-4 sm:p-5">
        {/* Shimmer overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />

        {/* Category badge placeholder */}
        <div className="relative z-10 w-16 h-5 bg-gray-300/80 rounded" />

        {/* Title lines placeholder (bottom overlay) */}
        <div className="relative z-10 space-y-2 mt-auto w-full">
          <div className="h-4 sm:h-5 bg-gray-300/80 rounded w-11/12" />
          <div className="h-4 sm:h-5 bg-gray-300/80 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonNewsCard;
