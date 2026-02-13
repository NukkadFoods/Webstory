import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, ThumbsUp, Loader2, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

const ReelsPage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef(null);
  const videoRefs = useRef({});
  const touchStartY = useRef(0);
  const adInitialized = useRef(new Set());
  const nextPageToken = useRef(null);
  const isManualScroll = useRef(false);

  const AD_FREQUENCY = 5; // Show ad every 5 videos
  const INITIAL_LOAD = 19; // Load 19 videos initially
  const LOAD_MORE_THRESHOLD = 15; // When user reaches video 15, load more

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    // Control video playback when index changes
    if (videos.length > 0) {
      // Initialize ads for current and next few slides
      initializeAdsForRange(currentIndex, currentIndex + 3);
      
      // Delay to ensure any scroll animation completes
      setTimeout(() => {
        // Control video playback - pause all except current
        Object.keys(videoRefs.current).forEach((key) => {
          const videoContainer = videoRefs.current[key];
          const iframe = videoContainer?.querySelector('iframe');
          const index = parseInt(key);
          
          if (iframe && iframe.contentWindow) {
            try {
              if (index === currentIndex) {
                // Play current video
                iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                iframe.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
              } else {
                // Pause other videos
                iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
              }
            } catch (e) {
              // Ignore postMessage errors
            }
          }
        });
      }, 500);
    }
  }, [currentIndex, videos.length]);

  // Intersection Observer for scroll detection
  useEffect(() => {
    if (!containerRef.current || videos.length === 0) return;

    const observerOptions = {
      root: containerRef.current,
      threshold: 0.5, // 50% of the element must be visible
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const videoIndex = parseInt(entry.target.dataset.videoIndex);
          if (!isNaN(videoIndex) && videoIndex !== currentIndex && !isManualScroll.current) {
            console.log('Visible video changed to:', videoIndex);
            setCurrentIndex(videoIndex);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all video containers
    Object.values(videoRefs.current).forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [videos.length]);

  const initializeAdsForRange = (startIndex, endIndex) => {
    for (let i = startIndex; i <= endIndex; i++) {
      if ((i + 1) % AD_FREQUENCY === 0 && !adInitialized.current.has(i)) {
        const adElement = document.getElementById(`reel-ad-${i}`);
        if (adElement && window.adsbygoogle && !adElement.hasChildNodes()) {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            adInitialized.current.add(i);
            console.log('✅ Initialized ad for reel:', i);
          } catch (err) {
            console.error('❌ Failed to initialize ad:', err);
          }
        }
      }
    }
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from backend API
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/youtube/videos?maxResults=50&type=all`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      
      if (data.success) {
        setVideos(data.videos);
      } else {
        throw new Error(data.error || 'Failed to load videos');
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatViewCount = (count) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const scrollToNext = useCallback(() => {
    if (isScrolling || currentIndex >= videos.length - 1) return;
    
    isManualScroll.current = true;
    setIsScrolling(true);
    setCurrentIndex(prev => prev + 1);
    
    setTimeout(() => {
      setIsScrolling(false);
      isManualScroll.current = false;
    }, 800);
  }, [currentIndex, videos.length, isScrolling]);

  const scrollToPrevious = useCallback(() => {
    if (isScrolling || currentIndex <= 0) return;
    
    isManualScroll.current = true;
    setIsScrolling(true);
    setCurrentIndex(prev => prev - 1);
    
    setTimeout(() => {
      setIsScrolling(false);
      isManualScroll.current = false;
    }, 800);
  }, [currentIndex, isScrolling]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollToNext, scrollToPrevious]);

  // Touch/Swipe navigation
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        scrollToNext();
      } else {
        scrollToPrevious();
      }
    }
  };

  // Mouse wheel navigation
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      scrollToNext();
    } else if (e.deltaY < 0) {
      scrollToPrevious();
    }
  }, [scrollToNext, scrollToPrevious]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="text-center">
          <Loader2 size={48} className="text-white mb-4 animate-spin mx-auto" />
          <p className="text-white">Loading reels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button 
            onClick={fetchVideos}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <p className="text-white">No videos found</p>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black overflow-hidden"
      style={{ height: '100vh', width: '100vw' }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reels Container */}
      <div 
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >
        {videos.map((video, index) => (
          <React.Fragment key={video.videoId}>
            {/* Regular Video Reel */}
            <div 
              ref={(el) => videoRefs.current[index] = el}
              data-video-index={index}
              className="relative h-screen w-full snap-start flex items-center justify-center"
            >
              {/* Video Player - Centered */}
              <div className="relative w-full max-w-md mx-auto" style={{ aspectRatio: '9/16', maxHeight: '100vh' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`${video.embedUrl}?enablejsapi=1&autoplay=0&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1&origin=${window.location.origin}`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />                {/* Gradient Overlay at Bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
                
                {/* Video Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 drop-shadow-lg">
                    {video.title}
                  </h3>
                  
                  <div className="flex items-center space-x-4 text-sm mb-3">
                    <span className="flex items-center">
                      <Eye size={14} className="mr-1" />
                      {formatViewCount(video.viewCount)}
                    </span>
                    <span className="flex items-center">
                      <ThumbsUp size={14} className="mr-1" />
                      {formatViewCount(video.likeCount)}
                    </span>
                    <span>{formatDate(video.publishedAt)}</span>
                  </div>

                  {/* Watch on YouTube Button */}
                  <a
                    href={video.shortsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={14} className="mr-2" />
                    Watch on YouTube
                  </a>
                </div>
              </div>

              {/* Navigation Buttons - Side */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-4 z-10">
                {currentIndex > 0 && (
                  <button
                    onClick={scrollToPrevious}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
                    aria-label="Previous video"
                  >
                    <ArrowUp size={24} />
                  </button>
                )}
                {currentIndex < videos.length - 1 && (
                  <button
                    onClick={scrollToNext}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
                    aria-label="Next video"
                  >
                    <ArrowDown size={24} />
                  </button>
                )}
              </div>

              {/* Progress Indicator */}
              <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {videos.length}
              </div>
            </div>

            {/* Ad Slide - Insert ad every AD_FREQUENCY videos */}
            {(index + 1) % AD_FREQUENCY === 0 && index < videos.length - 1 && (
              <div 
                className="relative h-screen w-full snap-start flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900"
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                  }}></div>
                </div>

                {/* Ad Content Container - Reel-like format */}
                <div className="relative w-full max-w-md mx-auto px-4" style={{ aspectRatio: '9/16', maxHeight: '100vh' }}>
                  {/* Ad Banner */}
                  <div className="absolute inset-0 flex flex-col justify-between p-6">
                    {/* Top Section */}
                    <div className="text-center">
                      <div className="inline-block bg-yellow-500 text-black px-4 py-1 rounded-full text-xs font-bold mb-4 animate-pulse">
                        ADVERTISEMENT
                      </div>
                    </div>

                    {/* Center - Ad Content */}
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-full">
                        <ins 
                          id={`reel-ad-${index}`}
                          className="adsbygoogle"
                          style={{ 
                            display: 'block',
                            minHeight: '250px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: '12px'
                          }}
                          data-ad-client="ca-pub-1825834035687372"
                          data-ad-slot="4993440134"
                          data-ad-format="auto"
                          data-full-width-responsive="true"
                        />
                      </div>
                    </div>

                    {/* Bottom Section - Swipe Up Indicator */}
                    <div className="text-center space-y-4">
                      <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 inline-block">
                        <p className="text-white text-sm font-semibold flex items-center">
                          <ArrowDown size={16} className="mr-2 animate-bounce" />
                          Swipe up to continue
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-4 z-10">
                  <button
                    onClick={scrollToPrevious}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
                    aria-label="Previous"
                  >
                    <ArrowUp size={24} />
                  </button>
                  <button
                    onClick={scrollToNext}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all"
                    aria-label="Next video"
                  >
                    <ArrowDown size={24} />
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
        
        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="relative h-screen w-full snap-start flex items-center justify-center bg-black">
            <div className="text-center">
              <Loader2 size={48} className="text-white mb-4 animate-spin mx-auto" />
              <p className="text-white">Loading more reels...</p>
            </div>
          </div>
        )}
        
        {/* End of Reels */}
        {!hasMore && videos.length > 0 && (
          <div className="relative h-screen w-full snap-start flex items-center justify-center bg-black">
            <div className="text-center text-white p-8">
              <h2 className="text-2xl font-bold mb-4">You've watched all reels! 🎉</h2>
              <p className="mb-6">Check back later for more content</p>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full transition-colors"
              >
                Watch Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions Overlay (shows briefly on first load) */}
      {currentIndex === 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white text-center animate-bounce pointer-events-none">
          <p className="text-sm bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
            Swipe up or use arrow keys to navigate
          </p>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ReelsPage;
