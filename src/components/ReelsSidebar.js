import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link } from 'react-router-dom';
import { getYouTubeVideos } from '../services/youtubeService';
import { Play, X, ChevronLeft } from 'lucide-react';
import ReelPlayer from './ReelPlayer';

const ReelsSidebar = ({ horizontal = false }) => {
  const [reelsData, setReelsData] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);

  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const openReelPlayer = (index) => {
    setSelectedReelIndex(index);
    setIsPlayerOpen(true);
    setIsDrawerOpen(false); // Close drawer when player opens
  };

  const fetchYouTubeReels = async (token = '') => {
    if (loading) return;
    setLoading(true);
    try {
      const { videos, nextPageToken: newToken } = await getYouTubeVideos(15, token);
      if (token) {
        setReelsData(prev => [...prev, ...videos]);
      } else {
        setReelsData(videos);
      }
      setNextPageToken(newToken);
    } catch (err) {
      console.error('Failed to load reels', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYouTubeReels();
  }, []);

  const loadMoreReels = () => {
    if (nextPageToken) {
      fetchYouTubeReels(nextPageToken);
    }
  };

  // Horizontal mode - for bottom slider
  if (horizontal) {
    return (
      <>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {reelsData.length > 0 ? reelsData.map((reel, index) => (
            <button
              key={`reel-horizontal-${reel.videoId || reel.id}-${index}`}
              onClick={() => openReelPlayer(index)}
              className="flex-none w-40 group relative rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 snap-start"
              style={{ height: '220px' }}
            >
              <img
                src={reel.thumbnail?.high || reel.thumbnail?.medium || reel.thumbnail?.default || reel.thumbnail}
                alt={reel.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              {/* Play Icon Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/30 backdrop-blur-sm p-3 rounded-full">
                  <Play size={12} className="text-white text-xl" />
                </div>
              </div>

              <div className="absolute top-2 right-2 bg-red-600 rounded px-1.5 py-0.5 flex items-center gap-1 text-white text-[8px] font-bold">
                <Play size={12} className="text-[6px]" /> SHORTS
              </div>

              <div className="absolute bottom-0 left-0 w-full p-2">
                <h4 className="text-white font-semibold text-[10px] leading-snug line-clamp-2">{reel.title}</h4>
                <p className="text-gray-300 text-[8px] flex items-center gap-1 mt-1">
                  <Play size={12} className="text-[6px]" />
                  {parseInt(reel.viewCount).toLocaleString()} views
                </p>
              </div>
            </button>
          )) : (
            <div className="text-sm text-gray-400 text-center py-4 w-full">Loading reels...</div>
          )}

          {/* Load More Button */}
          {nextPageToken && (
            <button
              onClick={loadMoreReels}
              disabled={loading}
              className="flex-none w-32 h-[220px] bg-white/10 rounded-xl flex items-center justify-center text-white text-sm font-medium hover:bg-white/20 transition"
            >
              {loading ? 'Loading...' : 'Load More →'}
            </button>
          )}
        </div>

        {/* Reel Player - Use Portal to render at document root (fixes transform stacking context issue) */}
        {isPlayerOpen && ReactDOM.createPortal(
          <ReelPlayer
            reels={reelsData}
            initialIndex={selectedReelIndex}
            isOpen={isPlayerOpen}
            onClose={() => setIsPlayerOpen(false)}
            onLoadMore={loadMoreReels}
            hasMore={!!nextPageToken}
          />,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      {/* Mobile: Slide-out Drawer */}
      <div className="lg:hidden">
        {/* Clickable Tab on Right Edge */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-l from-pink-600 to-pink-500 text-white py-4 px-2 rounded-l-xl shadow-lg flex flex-col items-center gap-1 hover:px-3 transition-all duration-300"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <Play size={12} className="text-sm rotate-90 mb-1" />
          <span className="text-xs font-bold tracking-wider">REELS</span>
          <ChevronLeft size={12} className="text-xs mt-1 animate-pulse" />
        </button>

        {/* Overlay */}
        {isDrawerOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}

        {/* Drawer Panel */}
        <div
          className={`fixed top-0 right-0 h-full w-[75%] max-w-[280px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          style={{ contain: 'layout' }}
        >
          {/* Drawer Header */}
          <div className="sticky top-0 bg-gradient-to-r from-pink-600 to-pink-500 p-4 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Play size={12} /> Top Reels
            </h3>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-white hover:bg-white/20 p-2 rounded-full transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="overflow-y-auto h-[calc(100%-60px)] p-3 space-y-3">
            {reelsData.length > 0 ? reelsData.map((reel, index) => (
              <button
                key={`reel-mobile-${reel.videoId || reel.id}-${index}`}
                onClick={() => openReelPlayer(index)}
                className="block w-full group relative rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300 text-left"
                style={{ height: '180px' }}
              >
                <img
                  src={reel.thumbnail?.high || reel.thumbnail?.medium || reel.thumbnail?.default || reel.thumbnail}
                  alt={reel.title}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full">
                    <Play size={12} className="text-white text-2xl" />
                  </div>
                </div>

                <div className="absolute top-2 right-2 bg-red-600 rounded px-1.5 py-0.5 flex items-center gap-1 text-white text-[8px] font-bold">
                  <Play size={12} className="text-[6px]" /> SHORTS
                </div>

                <div className="absolute bottom-0 left-0 w-full p-2">
                  <h4 className="text-white font-semibold text-[10px] leading-snug line-clamp-2">{reel.title}</h4>
                  <p className="text-gray-300 text-[9px] flex items-center gap-1 mt-1">
                    <Play size={12} className="text-[7px]" />
                    {parseInt(reel.viewCount).toLocaleString()} views
                  </p>
                </div>
              </button>
            )) : (
              <div className="text-sm text-gray-500 text-center py-8">
                Loading reels...
              </div>
            )}

            {/* View All / Load More Link */}
            {nextPageToken && (
              <button
                onClick={loadMoreReels}
                disabled={loading}
                className="block w-full text-center py-3 bg-gray-100 text-gray-600 font-semibold rounded-lg hover:bg-gray-200 transition text-xs"
              >
                {loading ? 'Loading...' : 'Load More Reels'}
              </button>
            )}

            <Link
              to="/reels"
              className="block text-center py-3 bg-pink-50 text-pink-600 font-semibold rounded-lg hover:bg-pink-100 transition mt-2"
              onClick={() => setIsDrawerOpen(false)}
            >
              View Full Page
            </Link>
          </div>
        </div>
      </div>

      {/* Embedded Reel Player */}
      <ReelPlayer
        reels={reelsData}
        initialIndex={selectedReelIndex}
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        onLoadMore={loadMoreReels}
        hasMore={!!nextPageToken}
      />

      {/* Desktop: Vertical Sidebar */}
      <aside className="hidden lg:block w-56 xl:w-64 border-l border-gray-200 bg-white">
        <div className="sticky top-24 h-[calc(100vh-6rem)] px-3">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Play size={12} className="text-pink-500" /> Top Reels
            </h3>
            <Link to="/reels" className="text-xs text-blue-600 cursor-pointer font-medium">View All</Link>
          </div>

          <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 4rem)' }}>
            {reelsData.length > 0 ? reelsData.map((reel, index) => (
              <button
                key={`reel-${reel.videoId || reel.id}-${index}`}
                onClick={() => openReelPlayer(index)}
                className="block w-full group relative rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300 text-left"
                style={{ height: '200px' }}
              >
                <img
                  src={reel.thumbnail?.high || reel.thumbnail?.medium || reel.thumbnail?.default || reel.thumbnail}
                  alt={reel.title}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                    <Play size={12} className="text-white text-xl" />
                  </div>
                </div>

                <div className="absolute top-2 right-2 bg-red-600 rounded px-2 py-0.5 flex items-center gap-1 text-white text-[10px] font-bold">
                  <Play size={12} className="text-[8px]" /> SHORTS
                </div>

                <div className="absolute bottom-0 left-0 w-full p-3">
                  <h4 className="text-white font-semibold text-xs leading-snug mb-1 line-clamp-2">{reel.title}</h4>
                  <p className="text-gray-300 text-[10px] flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Play size={12} className="text-[8px]" /> {parseInt(reel.viewCount).toLocaleString()} views
                    </span>
                    {reel.duration && <span>• {reel.duration}</span>}
                  </p>
                </div>
              </button>
            )) : (
              <div className="text-sm text-gray-500 text-center py-8">
                Loading reels...
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default ReelsSidebar;
