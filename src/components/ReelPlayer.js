import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronUp, faChevronDown, faVolumeUp, faVolumeMute, faExpand, faHeart, faComment, faShare, faPlay, faPause } from '@fortawesome/free-solid-svg-icons';

const ReelPlayer = ({ reels, initialIndex = 0, isOpen, onClose, onLoadMore, hasMore }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isMuted, setIsMuted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isLiked, setIsLiked] = useState({});
    const containerRef = useRef(null);

    // Gestures
    const touchStartY = useRef(0);
    const mouseDownY = useRef(0);
    const isDragging = useRef(false);
    const lastScrollTime = useRef(0);

    const currentReel = reels[currentIndex];

    // Reset index when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setIsPaused(false);
        }
    }, [isOpen, initialIndex]);

    // Load more when reaching end
    useEffect(() => {
        if (isOpen && hasMore && currentIndex >= reels.length - 3) {
            onLoadMore?.();
        }
    }, [currentIndex, reels.length, hasMore, isOpen, onLoadMore]);

    // Keyboard navigation
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
            } else if (e.key === ' ') {
                setIsPaused(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex]);

    // Navigation Logic
    const goToNext = useCallback(() => {
        const now = Date.now();
        // Debounce fast scrolls (500ms)
        if (now - lastScrollTime.current < 500) return;
        lastScrollTime.current = now;

        if (currentIndex < reels.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsPaused(false);
        } else if (hasMore) {
            onLoadMore?.();
        }
    }, [currentIndex, reels.length, hasMore, onLoadMore]);

    const goToPrevious = useCallback(() => {
        const now = Date.now();
        if (now - lastScrollTime.current < 500) return;
        lastScrollTime.current = now;

        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsPaused(false);
        }
    }, [currentIndex]);

    // --- Touch Handlers ---
    const handleTouchStart = (e) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchStartY.current - touchEndY;

        if (Math.abs(diff) > 50) {
            if (diff > 0) goToNext();
            else goToPrevious();
        }
    };

    // --- Mouse Handlers (for Desktop dragging) ---
    const handleMouseDown = (e) => {
        isDragging.current = true;
        mouseDownY.current = e.clientY;
    };

    const handleMouseUp = (e) => {
        if (!isDragging.current) return;
        isDragging.current = false;

        const mouseUpY = e.clientY;
        const diff = mouseDownY.current - mouseUpY;

        // If drag was small, treat as click to toggle pause
        if (Math.abs(diff) < 10) {
            togglePlay();
            return;
        }

        if (Math.abs(diff) > 50) {
            if (diff > 0) goToNext();
            else goToPrevious();
        }
    };

    const handleMouseLeave = () => {
        isDragging.current = false;
    };

    // --- Wheel Handler (Trackpad/MouseWheel) ---
    const handleWheel = (e) => {
        // Prevent default scrolling
        // e.preventDefault(); // React passive event issue, solved by touch-none css usually but let's debounce logic

        if (Math.abs(e.deltaY) > 50) {
            if (e.deltaY > 0) goToNext();
            else goToPrevious();
        }
    };

    const togglePlay = () => {
        setIsPaused(prev => !prev);
    };

    const toggleLike = (e) => {
        e.stopPropagation();
        setIsLiked(prev => ({
            ...prev,
            [currentReel?.videoId]: !prev[currentReel?.videoId]
        }));
    };

    const handleShare = async (e) => {
        e.stopPropagation();
        const url = currentReel?.shortsUrl || currentReel?.watchUrl;
        if (navigator.share) {
            try {
                await navigator.share({ title: currentReel?.title, url: url });
            } catch (err) { console.log('Share cancelled'); }
        } else {
            navigator.clipboard.writeText(url);
            alert('Link copied!');
        }
    };

    if (!isOpen || !currentReel) return null;

    const videoId = currentReel.videoId || currentReel.id;
    // Autoplay depends on isPaused/isMuted
    // If paused, we remove 'autoplay=1' or set 'autoplay=0' but iframe reload is jerky.
    // Better to overlay a "Paused" icon or use YouTube Player API relative-ly. 
    // For simple iframe, we can't truly pause without API. 
    // So we will just show a "Pause" icon overlay and keeping it playing in background or unmount/remount (bad).
    // Actually, simplest 'pause' for iframe embed is just `pointer-events-none`? No.
    // We'll stick to the "Play/Pause" overlay VISUAL cue for now, or re-render iframe with autoplay=0 if paused (jerky).
    // Actually, widespread pattern for simple embeds: just mute or overlay. 
    // Let's control 'mute' mainly. 'Pause' strictly via iframe src update is okay.

    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${isPaused ? 0 : 1}&mute=${isMuted ? 1 : 0}&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&showinfo=0`;

    return (
        <div
            className="fixed inset-0 z-50 bg-black touch-none select-none"
            ref={containerRef}
            style={{ touchAction: 'none' }} // Critical for swipe persistence
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition cursor-pointer"
            >
                <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>

            {/* Video Counter */}
            <div className="absolute top-4 left-4 z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {hasMore ? '...' : reels.length}
            </div>

            {/* Main Video Container */}
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Video Embed */}
                <div className="relative w-full max-w-md h-full max-h-[90vh] mx-auto bg-gray-900 rounded-lg overflow-hidden">
                    <iframe
                        key={`${videoId}-${isPaused}`} // Re-render when pause toggles
                        src={embedUrl}
                        title={currentReel.title}
                        className="w-full h-full object-cover"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        frameBorder="0"
                    />

                    {/* Gesture Overlay (Transparent) */}
                    <div className="absolute inset-0 z-10 bg-transparent cursor-grab active:cursor-grabbing flex items-center justify-center">
                        {isPaused && (
                            <div className="bg-black/40 p-6 rounded-full backdrop-blur-sm animate-pulse">
                                <FontAwesomeIcon icon={faPlay} className="text-white text-4xl ml-2" />
                            </div>
                        )}
                    </div>

                    {/* Video Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 pointer-events-none">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-white font-bold text-sm line-clamp-2 flex-1 mr-4">
                                {currentReel.title}
                            </h3>
                            <a
                                href="https://www.youtube.com/@forexyy?sub_confirmation=1"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase hover:bg-red-700 transition pointer-events-auto"
                            >
                                Subscribe
                            </a>
                        </div>

                        <p className="text-gray-300 text-xs flex items-center gap-2">
                            <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                            {parseInt(currentReel.viewCount).toLocaleString()} views
                        </p>
                    </div>
                </div>

                {/* Side Controls */}
                <div className="absolute right-4 bottom-1/3 flex flex-col gap-4 items-center z-30">
                    <button
                        onClick={toggleLike}
                        className={`flex flex-col items-center gap-1 ${isLiked[videoId] ? 'text-red-500' : 'text-white'}`}
                    >
                        <div className={`p-3 rounded-full ${isLiked[videoId] ? 'bg-red-500/20' : 'bg-white/10'
                            } hover:bg-white/20 transition backdrop-blur-sm`}>
                            <FontAwesomeIcon icon={faHeart} size="lg" />
                        </div>
                        <span className="text-xs font-medium drop-shadow-md">Like</span>
                    </button>

                    <a
                        href={currentReel.watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 text-white"
                    >
                        <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-sm">
                            <FontAwesomeIcon icon={faComment} size="lg" />
                        </div>
                        <span className="text-xs font-medium drop-shadow-md">Comment</span>
                    </a>

                    <button
                        onClick={handleShare}
                        className="flex flex-col items-center gap-1 text-white"
                    >
                        <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-sm">
                            <FontAwesomeIcon icon={faShare} size="lg" />
                        </div>
                        <span className="text-xs font-medium drop-shadow-md">Share</span>
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMuted(prev => !prev); }}
                        className="flex flex-col items-center gap-1 text-white"
                    >
                        <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-sm">
                            <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} size="lg" />
                        </div>
                        <span className="text-xs font-medium drop-shadow-md">{isMuted ? 'Unmute' : 'Mute'}</span>
                    </button>
                </div>

                {/* Navigation Buttons (Desktop Helper) */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-2 z-30">
                    <button
                        onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                        disabled={currentIndex === 0}
                        className={`p-3 rounded-full transition ${currentIndex === 0
                            ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                            : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                            }`}
                    >
                        <FontAwesomeIcon icon={faChevronUp} size="lg" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        disabled={currentIndex === reels.length - 1 && !hasMore}
                        className={`p-3 rounded-full transition ${currentIndex === reels.length - 1 && !hasMore
                            ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                            : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                            }`}
                    >
                        <FontAwesomeIcon icon={faChevronDown} size="lg" />
                    </button>
                </div>

                {/* Swipe Hint (Mobile) */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50 text-xs lg:hidden animate-bounce z-20 pointer-events-none">
                    Swipe up for more
                </div>
            </div>
        </div>
    );
};

export default ReelPlayer;
