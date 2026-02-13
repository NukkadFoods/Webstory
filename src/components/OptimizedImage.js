import React, { useState } from 'react';

/**
 * OptimizedImage - Performance-optimized image component
 * Features:
 * - Explicit width/height to prevent CLS
 * - Lazy loading by default (eager for hero images)
 * - Async decoding
 * - Error fallback
 * - Aspect ratio preservation
 */
const OptimizedImage = ({
  src,
  alt,
  width = 400,
  height = 300,
  className = '',
  priority = false,
  aspectRatio = '4/3',
  fallback = null,
  onError,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  if (hasError) {
    if (fallback) {
      return fallback;
    }
    return (
      <div
        className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}
        style={{ aspectRatio, width: '100%' }}
      >
        <span className="text-4xl">📰</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      className={`${className} ${!isLoaded ? 'bg-gray-200' : ''}`}
      style={{ aspectRatio }}
      onError={handleError}
      onLoad={handleLoad}
      referrerPolicy="no-referrer"
      {...props}
    />
  );
};

export default OptimizedImage;
