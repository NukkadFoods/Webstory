import React from 'react';

const SkeletonTrending = () => {
  // Render 3 horizontally scrolling trending card placeholders
  const placeholders = Array(3).fill(null);

  return (
    <section className="mb-6 sm:mb-8 animate-pulse w-full select-none">
      {/* Trending header placeholder */}
      <div className="flex items-center justify-between pb-2 sm:pb-3 mb-3 sm:mb-4 border-b border-gray-200/60">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <div className="h-5 sm:h-6 bg-gray-300 rounded w-36" />
        </div>
        <div className="h-4 bg-gray-300 rounded w-20" />
      </div>

      {/* Horizontal scrolling row */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
        {placeholders.map((_, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 w-64 sm:w-72 md:w-80"
          >
            <div className="relative rounded-xl overflow-hidden bg-gray-200 h-44 sm:h-48 p-3 sm:p-4 flex flex-col justify-between">
              {/* Shimmer overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />

              {/* Rank badge placeholder */}
              <div className="relative z-10 w-7 h-7 rounded-full bg-gray-300/80 flex items-center justify-center font-bold text-xs" />

              {/* Title & Section placeholder */}
              <div className="relative z-10 space-y-1.5 mt-auto w-full">
                <div className="h-3 bg-gray-300/80 rounded w-16" />
                <div className="h-4 bg-gray-300/80 rounded w-11/12" />
                <div className="h-4 bg-gray-300/80 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SkeletonTrending;
