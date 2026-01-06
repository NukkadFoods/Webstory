import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getYouTubeVideos } from '../services/youtubeService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';

const ReelsSidebar = () => {
  const [reelsData, setReelsData] = useState([]);

  useEffect(() => {
    const fetchYouTubeReels = async () => {
      const videos = await getYouTubeVideos(15);
      setReelsData(videos);
    };
    fetchYouTubeReels();
  }, []);

  return (
    <aside className="hidden lg:block w-56 xl:w-64 border-l border-gray-200 bg-white">
      <div className="sticky top-24 h-[calc(100vh-6rem)] px-3">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
            <FontAwesomeIcon icon={faPlay} className="text-pink-500" /> Top Reels
          </h3>
          <Link to="/reels" className="text-xs text-blue-600 cursor-pointer font-medium">View All</Link>
        </div>

        <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{height: 'calc(100% - 4rem)'}}>
          {reelsData.length > 0 ? reelsData.map((reel, index) => (
            <a 
              key={`reel-${reel.videoId || reel.id}-${index}`}
              href={reel.shortsUrl || reel.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block group relative rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300"
              style={{ height: '200px' }}
            >
              <img 
                src={reel.thumbnail?.high || reel.thumbnail?.medium || reel.thumbnail?.default || reel.thumbnail}
                alt={reel.title} 
                className="w-full h-full object-cover"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              
              <div className="absolute top-2 right-2 bg-red-600 rounded px-2 py-0.5 flex items-center gap-1 text-white text-[10px] font-bold">
                <FontAwesomeIcon icon={faPlay} className="text-[8px]" /> SHORTS
              </div>

              <div className="absolute bottom-0 left-0 w-full p-3">
                <h4 className="text-white font-semibold text-xs leading-snug mb-1 line-clamp-2">{reel.title}</h4>
                <p className="text-gray-300 text-[10px] flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faPlay} className="text-[8px]" /> {parseInt(reel.viewCount).toLocaleString()} views
                  </span>
                  {reel.duration && <span>• {reel.duration}</span>}
                </p>
              </div>
            </a>
          )) : (
            <div className="text-sm text-gray-500 text-center py-8">
              Loading reels...
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default ReelsSidebar;
