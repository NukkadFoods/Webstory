import React from 'react';

const SkeletonHero = () => {
  return (
    <div className="mb-8 sm:mb-12 animate-pulse w-full select-none">
      <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] w-full overflow-hidden rounded-xl sm:rounded-2xl bg-gray-200 p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-end">
        {/* Shimmer overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />

        {/* Hero section badge placeholder */}
        <div className="relative z-10 w-24 h-5 sm:h-6 bg-gray-300/80 rounded mb-2 sm:mb-3" />

        {/* Hero title placeholder (multiline) */}
        <div className="relative z-10 space-y-2.5 sm:space-y-3 w-full max-w-4xl">
          <div className="h-6 sm:h-8 md:h-10 bg-gray-300/80 rounded w-11/12" />
          <div className="h-6 sm:h-8 md:h-10 bg-gray-300/80 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonHero;
