import React from 'react';

const LoadingSpinner = ({ message = "Loading latest news...", className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="relative">
        {/* Spinning circle */}
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        {/* Pulsing inner circle */}
        <div className="absolute top-2 left-2 w-8 h-8 bg-blue-100 rounded-full animate-pulse"></div>
      </div>
      
      <div className="mt-6 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
        <p className="text-sm text-gray-600">
          Getting the latest updates for you...
        </p>
      </div>
      
      {/* Loading dots animation */}
      <div className="flex space-x-1 mt-4">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
