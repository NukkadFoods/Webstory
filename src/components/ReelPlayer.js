import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronUp, faChevronDown, faVolumeUp, faVolumeMute, faExpand, faHeart, faComment, faShare, faPlay } from '@fortawesome/free-solid-svg-icons';

const ReelPlayer = ({ reels, initialIndex = 0, isOpen, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isMuted, setIsMuted] = useState(false);
    const [isLiked, setIsLiked] = useState({});
    const containerRef = useRef(null);
    const touchStartY = useRef(0);

    const currentReel = reels[currentIndex];

    // Reset index when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'k') {
                goToPrevious();
            } else if (e.key === 'ArrowDown' || e.key === 'j') {
                goToNext();
            } else if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'm') {
                setIsMuted(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex]);

    // Handle touch swipe
    const handleTouchStart = (e) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchStartY.current - touchEndY;

        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                goToNext();
            } else {
                goToPrevious();
            }
        }
    };

    const goToNext = useCallback(() => {
        if (currentIndex < reels.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentIndex, reels.length]);

    const goToPrevious = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex]);

    const toggleLike = () => {
        setIsLiked(prev => ({
            ...prev,
            [currentReel?.videoId]: !prev[currentReel?.videoId]
        }));
    };

    const handleShare = async () => {
        const url = currentReel?.shortsUrl || currentReel?.watchUrl;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: currentReel?.title,
                    url: url
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            navigator.clipboard.writeText(url);
            alert('Link copied!');
        }
    };

    if (!isOpen || !currentReel) return null;

    // Get YouTube video ID
    const videoId = currentReel.videoId || currentReel.id;
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&showinfo=0`;

    return (
        <div
            className="fixed inset-0 z-50 bg-black"
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition"
            >
                <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>

            {/* Video Counter */}
            <div className="absolute top-4 left-4 z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {reels.length}
            </div>

            {/* Main Video Container */}
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Video Embed */}
                <div className="relative w-full max-w-md h-full max-h-[90vh] mx-auto">
                    <iframe
                        key={videoId} // Force re-render on video change
                        src={embedUrl}
                        title={currentReel.title}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        frameBorder="0"
                    />

                    {/* Video Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <h3 className="text-white font-bold text-sm line-clamp-2 mb-2">
                            {currentReel.title}
                        </h3>
                        <p className="text-gray-300 text-xs flex items-center gap-2">
                            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                            {parseInt(currentReel.viewCount).toLocaleString()} views
                        </p>
                    </div>
                </div>

                {/* Side Controls */}
                <div className="absolute right-4 bottom-1/3 flex flex-col gap-4 items-center">
                    {/* Like */}
                    <button
                        onClick={toggleLike}
                        className={`flex flex-col items-center gap-1 ${
                            isLiked[videoId] ? 'text-red-500' : 'text-white'
                        }`}
                    >
                        <div className={`p-3 rounded-full ${
                            isLiked[videoId] ? 'bg-red-500/20' : 'bg-white/10'
                        } hover:bg-white/20 transition`}>
                            <FontAwesomeIcon icon={faHeart} size="lg" />
                        </div>
                        <span className="text-xs">Like</span>
                    </button>

                    {/* Comment - Opens YouTube */}
                    <a
                        href={currentReel.watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 text-white"
                    >
                        <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition">
                            <FontAwesomeIcon icon={faComment} size="lg" />
                        </div>
                        <span className="text-xs">Comment</span>
                    </a>

                    {/* Share */}
                    <button
                        onClick={handleShare}
                        className="flex flex-col items-center gap-1 text-white"
                    >
                        <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition">
                            <FontAwesomeIcon icon={faShare} size="lg" />
                        </div>
                        <span className="text-xs">Share</span>
                    </button>

                    {/* Mute/Unmute */}
                    <button
                        onClick={() => setIsMuted(prev => !prev)}
                        className="flex flex-col items-center gap-1 text-white"
                    >
                        <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition">
                            <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} size="lg" />
                        </div>
                        <span className="text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
                    </button>
                </div>

                {/* Navigation Buttons */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                    <button
                        onClick={goToPrevious}
                        disabled={currentIndex === 0}
                        className={`p-3 rounded-full transition ${
                            currentIndex === 0
                                ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                                : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                    >
                        <FontAwesomeIcon icon={faChevronUp} size="lg" />
                    </button>
                    <button
                        onClick={goToNext}
                        disabled={currentIndex === reels.length - 1}
                        className={`p-3 rounded-full transition ${
                            currentIndex === reels.length - 1
                                ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                                : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                    >
                        <FontAwesomeIcon icon={faChevronDown} size="lg" />
                    </button>
                </div>

                {/* Swipe Hint (Mobile) */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50 text-xs lg:hidden animate-bounce">
                    Swipe up/down for more
                </div>
            </div>

            {/* Keyboard Hints (Desktop) */}
            <div className="absolute bottom-4 left-4 hidden lg:flex gap-4 text-white/50 text-xs">
                <span>↑↓ Navigate</span>
                <span>M Mute</span>
                <span>ESC Close</span>
            </div>
        </div>
    );
};

export default ReelPlayer;
