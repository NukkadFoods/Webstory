import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Loader, Volume2, VolumeX } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL ||
    (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://webstorybackend.onrender.com');

// Parse commentary into sections for synced highlighting
const parseCommentaryIntoSections = (text) => {
    if (!text) return [];

    const sections = [];

    // Try to detect section headers
    const keyPointsMatch = text.match(/Key Points/i);
    const impactMatch = text.match(/Impact Analysis/i);
    const outlookMatch = text.match(/Future Outlook/i);

    if (keyPointsMatch && impactMatch && outlookMatch) {
        const keyStart = keyPointsMatch.index;
        const impactStart = impactMatch.index;
        const outlookStart = outlookMatch.index;

        sections.push({
            title: 'Key Points',
            content: text.substring(keyStart, impactStart).replace(/Key Points/i, '').trim()
        });
        sections.push({
            title: 'Impact Analysis',
            content: text.substring(impactStart, outlookStart).replace(/Impact Analysis/i, '').trim()
        });
        sections.push({
            title: 'Future Outlook',
            content: text.substring(outlookStart).replace(/Future Outlook/i, '').trim()
        });
    } else {
        // Fallback: split by paragraphs
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        paragraphs.forEach((p, i) => {
            sections.push({
                title: i === 0 ? 'Overview' : i === 1 ? 'Analysis' : 'Outlook',
                content: p.trim()
            });
        });
    }

    return sections.length > 0 ? sections : [{ title: 'Analysis', content: text }];
};

// Format time as MM:SS
const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayer = ({ commentary, title, onSectionChange }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [currentSection, setCurrentSection] = useState(0);

    const sections = useMemo(() => parseCommentaryIntoSections(commentary), [commentary]);

    // Calculate section timestamps (estimated based on content length)
    const sectionTimestamps = useMemo(() => {
        if (!sections.length || !duration) return [];

        // Estimate time per section based on content length
        const totalLength = sections.reduce((sum, s) => sum + s.content.length, 0);
        let cumulative = 0;

        return sections.map((section, idx) => {
            const start = (cumulative / totalLength) * duration;
            cumulative += section.content.length;
            const end = (cumulative / totalLength) * duration;
            return { start, end, index: idx };
        });
    }, [sections, duration]);

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    // Reset state when commentary changes
    useEffect(() => {
        setError(null);
        setAudioUrl(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setCurrentSection(0);
    }, [commentary]);

    // Update current section based on audio progress
    useEffect(() => {
        if (duration > 0 && sectionTimestamps.length > 0) {
            const newSection = sectionTimestamps.findIndex(
                ts => currentTime >= ts.start && currentTime < ts.end
            );
            if (newSection !== -1 && newSection !== currentSection) {
                setCurrentSection(newSection);
                onSectionChange?.(newSection);
            }
        }
    }, [currentTime, duration, sectionTimestamps, currentSection, onSectionChange]);

    const handleTimeUpdate = useCallback(() => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    }, []);

    const handleSeek = useCallback((e) => {
        const newTime = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    }, []);

    // Jump to specific section
    const jumpToSection = useCallback((sectionIndex) => {
        if (!audioRef.current || !sectionTimestamps[sectionIndex]) return;

        const targetTime = sectionTimestamps[sectionIndex].start;
        audioRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        setCurrentSection(sectionIndex);
        onSectionChange?.(sectionIndex);

        // Start playing if not already
        if (audioRef.current.paused && audioUrl) {
            audioRef.current.play();
            setIsPlaying(true);
        }
    }, [sectionTimestamps, audioUrl, onSectionChange]);

    const handlePlay = async () => {
        if (!commentary) {
            setError('No commentary available');
            return;
        }

        // If already playing, pause
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
        }

        // If we already have the audio loaded, just play it
        if (audioUrl && audioRef.current) {
            try {
                await audioRef.current.play();
                setIsPlaying(true);
                onSectionChange?.(currentSection);
                return;
            } catch (err) {
                console.error('[AudioPlayer] Play error:', err);
            }
        }

        // Fetch new audio stream
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/tts/speak`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: commentary, title })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server error: ${response.status}`);
            }

            const blob = await response.blob();
            console.log('[AudioPlayer] Audio blob received:', { size: blob.size, type: blob.type });

            if (blob.size < 1000) {
                console.warn('[AudioPlayer] Blob too small, possibly an error message?');
                // Try to read as text to see if it's an error
                const text = await blob.text();
                console.warn('[AudioPlayer] Blob content:', text);
            }

            const url = URL.createObjectURL(blob);

            if (audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(url);

            if (audioRef.current) {
                audioRef.current.src = url;
                await audioRef.current.play();
                setIsPlaying(true);
                setCurrentSection(0);
                onSectionChange?.(0);
            }
        } catch (err) {
            console.error('[AudioPlayer] Error:', err);
            setError(err.message || 'Playback failed');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentSection(0);
        onSectionChange?.(-1);
    };

    if (!commentary) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="w-full max-w-2xl mx-auto my-6">
            {/* Main Player Card */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-5 shadow-2xl border border-gray-700">

                {/* Reporter Info Row */}
                <div className="flex items-center gap-4 mb-4">
                    {/* Avatar */}
                    <div className="relative">
                        <img
                            src="/images/rachel-anderson.jpeg"
                            alt="Rachel Anderson"
                            className="w-14 h-14 rounded-full object-cover shadow-lg border-2 border-blue-500"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white font-bold text-xl shadow-lg hidden">
                            RA
                        </div>
                        {isPlaying && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></span>
                        )}
                    </div>

                    {/* Name & Title */}
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-lg leading-tight">
                            Rachel Anderson
                        </h3>
                        <p className="text-blue-400 text-xs font-medium uppercase tracking-wider">
                            Senior Forexyy Newsletter Reporter
                        </p>
                    </div>

                    {/* Live Badge */}
                    {isPlaying && (
                        <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="text-red-400 text-xs font-bold uppercase">Live</span>
                        </div>
                    )}
                </div>

                {/* Clickable Section Buttons */}
                {sections.length > 1 && (
                    <div className="mb-4 flex gap-2">
                        {sections.map((section, idx) => (
                            <button
                                key={idx}
                                onClick={() => jumpToSection(idx)}
                                disabled={!audioUrl}
                                className={`flex-1 text-center py-2 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer
                                    ${idx === currentSection
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                        : idx < currentSection
                                            ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50'
                                            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                                    }
                                    ${!audioUrl ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                                `}
                            >
                                {section.title}
                            </button>
                        ))}
                    </div>
                )}

                {/* Controls Row */}
                <div className="flex items-center gap-4">
                    {/* Play/Pause Button */}
                    <button
                        onClick={handlePlay}
                        disabled={isLoading}
                        className={`flex items-center justify-center w-14 h-14 rounded-full transition-all ${isLoading
                                ? 'bg-gray-700 cursor-wait'
                                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30'
                            }`}
                    >
                        {isLoading ? (
                            <Loader size={24} className="animate-spin" />
                        ) : isPlaying ? (
                            <Pause size={24} fill="currentColor" />
                        ) : (
                            <Play size={24} fill="currentColor" className="ml-1" />
                        )}
                    </button>

                    {/* Seekbar & Time */}
                    <div className="flex-1">
                        {/* Seekbar with Section Markers */}
                        <div className="relative h-3 bg-gray-700 rounded-full overflow-visible">
                            {/* Progress Fill */}
                            <div
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            />

                            {/* Section Markers (Yellow) */}
                            {sectionTimestamps.map((ts, idx) => (
                                idx > 0 && (
                                    <button
                                        key={idx}
                                        onClick={() => jumpToSection(idx)}
                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-400 rounded-full border-2 border-gray-900 hover:scale-125 transition-transform z-10 cursor-pointer"
                                        style={{ left: `${(ts.start / duration) * 100}%` }}
                                        title={`Jump to ${sections[idx]?.title}`}
                                        disabled={!audioUrl}
                                    />
                                )
                            ))}

                            {/* Range Input (invisible but functional) */}
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={handleSeek}
                                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-20"
                                disabled={!audioUrl}
                            />
                        </div>

                        {/* Timestamps */}
                        <div className="flex justify-between mt-1">
                            <span className="text-gray-400 text-xs font-mono">
                                {formatTime(currentTime)}
                            </span>
                            <span className="text-gray-500 text-xs font-mono">
                                {formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    {/* Mute Button */}
                    <button
                        onClick={toggleMute}
                        className="p-2 text-gray-400 hover:text-white transition"
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-3 text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Status Message */}
                {isLoading && (
                    <div className="mt-3 text-blue-400 text-sm text-center">
                        Generating audio broadcast...
                    </div>
                )}

                {/* Hidden Audio Element */}
                <audio
                    ref={audioRef}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                    onError={() => {
                        setIsLoading(false);
                        setIsPlaying(false);
                        setError('Audio playback error');
                    }}
                    preload="metadata"
                    className="hidden"
                />
            </div>

            {/* Article Title */}
            <div className="mt-3 text-center">
                <p className="text-gray-500 text-xs">
                    Now covering: <span className="text-gray-300">{title || 'Breaking News'}</span>
                </p>
            </div>
        </div>
    );
};

export default AudioPlayer;
