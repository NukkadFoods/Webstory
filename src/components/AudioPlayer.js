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

const AudioPlayer = ({ commentary, title, onSectionChange, onProgressUpdate }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [currentSection, setCurrentSection] = useState(0);
    const [isPreloaded, setIsPreloaded] = useState(false);
    const preloadStartedRef = useRef(false);
    const abortControllerRef = useRef(null);

    const sections = useMemo(() => parseCommentaryIntoSections(commentary), [commentary]);

    // Calculate spoken weight (duration impact) of text
    const getSpeechWeight = (text) => {
        if (!text) return 0;
        let weight = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (/[A-Z]/.test(char)) {
                weight += 1.5; // Capitals take slightly longer
            } else if (/[0-9]/.test(char)) {
                weight += 1.2; // Numbers take slightly longer
            } else if ([',', ';', ':'].includes(char)) {
                weight += 3; // Slight pause
            } else if (['.', '!', '?'].includes(char)) {
                weight += 6; // Sentence end pause
            } else {
                weight += 1; // Standard char
            }
        }
        return weight;
    };

    // Calculate section timestamps with intro/outro offset
    // Uses advanced "Speech Weight" to account for character-level timing differences
    const sectionTimestamps = useMemo(() => {
        if (!sections.length || !duration) return [];

        const PAUSE_WEIGHTS = {
            TITLE: 25,   // Pause after title
            HEADER: 15,  // Pause after section header
        };

        const introText = title ? `${title}. ` : '';
        const outroText = " That wraps up this report.";

        // Calculate total weighted length of the entire script
        const introWeight = getSpeechWeight(introText) + (introText ? PAUSE_WEIGHTS.TITLE : 0);
        const outroWeight = getSpeechWeight(outroText);

        const sectionsDetails = sections.map(s => {
            const headerWeight = getSpeechWeight(s.title) + PAUSE_WEIGHTS.HEADER;
            const contentWeight = getSpeechWeight(s.content);
            return {
                headerWeight,
                contentWeight,
                totalWeight: headerWeight + contentWeight
            };
        });

        const sectionsWeight = sectionsDetails.reduce((sum, s) => sum + s.totalWeight, 0);
        const totalWeight = introWeight + sectionsWeight + outroWeight;

        // Base time unit (seconds per weight unit)
        const timePerWeight = duration / totalWeight;
        const introDuration = introWeight * timePerWeight;

        let cumulativeWeight = 0;

        return sections.map((section, idx) => {
            const { headerWeight, totalWeight: sectionTotalWeight } = sectionsDetails[idx];

            // Start time for this section (after intro + previous sections)
            const start = introDuration + (cumulativeWeight * timePerWeight);

            cumulativeWeight += sectionTotalWeight;

            // End time
            const end = introDuration + (cumulativeWeight * timePerWeight);

            // Content start (after header + pause)
            const contentStart = start + (headerWeight * timePerWeight);

            return {
                start,
                end,
                index: idx,
                contentStart
            };
        });
    }, [sections, duration, title]);

    // Calculate intro duration for start offset
    const introDuration = useMemo(() => {
        if (!duration) return 0;

        const PAUSE_WEIGHTS = { TITLE: 25, HEADER: 15 };
        const introText = title ? `${title}. ` : '';
        const outroText = " That wraps up this report.";

        const introWeight = getSpeechWeight(introText) + (introText ? PAUSE_WEIGHTS.TITLE : 0);
        const outroWeight = getSpeechWeight(outroText);

        const sectionsWeight = sections.reduce((sum, s) => {
            return sum + getSpeechWeight(s.title) + PAUSE_WEIGHTS.HEADER + getSpeechWeight(s.content);
        }, 0);

        const totalWeight = introWeight + sectionsWeight + outroWeight;

        return duration * (introWeight / totalWeight);
    }, [duration, title, sections]);

    // Cleanup blob URL and abort controller on unmount
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
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
        setIsPreloaded(false);
        preloadStartedRef.current = false;
    }, [commentary]);

    // Preload audio as soon as component mounts (user lands on page)
    useEffect(() => {
        if (!commentary || preloadStartedRef.current) return;

        preloadStartedRef.current = true;
        abortControllerRef.current = new AbortController();

        const preloadAudio = async () => {
            try {
                console.log('[AudioPlayer] Starting audio preload on page load...');

                const response = await fetch(`${API_BASE_URL}/api/tts/speak`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: commentary, title }),
                    signal: abortControllerRef.current.signal
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const blob = await response.blob();

                if (blob.size < 1000) {
                    console.warn('[AudioPlayer] Preload: blob too small');
                    return;
                }

                const url = URL.createObjectURL(blob);
                setAudioUrl(url);

                // Set audio source so it's ready to play instantly
                if (audioRef.current) {
                    audioRef.current.src = url;
                }

                setIsPreloaded(true);
                console.log('[AudioPlayer] Audio preloaded and ready!');
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('[AudioPlayer] Preload aborted (user navigated away)');
                } else {
                    console.error('[AudioPlayer] Preload error:', err);
                    // Don't show error - will retry on play click
                }
            }
        };

        preloadAudio();
    }, [commentary, title]);

    // Update current section and progress based on audio progress
    useEffect(() => {
        if (duration > 0 && sectionTimestamps.length > 0) {
            const newSection = sectionTimestamps.findIndex(
                ts => currentTime >= ts.start && currentTime < ts.end
            );

            const isInIntro = currentTime < introDuration;

            if (isInIntro) {
                // Still reading title/intro - no highlighting
                onProgressUpdate?.({
                    sectionIndex: -1,
                    sectionProgress: 0,
                    contentProgress: 0,
                    isReadingHeader: true,
                    currentTime,
                    duration,
                    isPlaying
                });
                return;
            }

            if (newSection !== -1) {
                if (newSection !== currentSection) {
                    setCurrentSection(newSection);
                    onSectionChange?.(newSection);
                }

                const ts = sectionTimestamps[newSection];

                // Check if still reading section header
                const isReadingHeader = currentTime < ts.contentStart;

                // Calculate progress within content only (not header)
                // contentStart is adjusted to include the header pause, so actual content reading starts there
                const contentDuration = ts.end - ts.contentStart;
                const contentProgress = contentDuration > 0 && !isReadingHeader
                    ? (currentTime - ts.contentStart) / contentDuration
                    : 0;

                // Report progress to parent for word highlighting
                onProgressUpdate?.({
                    sectionIndex: newSection,
                    sectionProgress: Math.min(Math.max(contentProgress, 0), 1),
                    contentProgress: Math.min(Math.max(contentProgress, 0), 1),
                    isReadingHeader,
                    currentTime,
                    duration,
                    isPlaying
                });
            }
        }
    }, [currentTime, duration, sectionTimestamps, introDuration, currentSection, onSectionChange, onProgressUpdate, isPlaying]);

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

        // If audio is preloaded, play instantly
        if (audioUrl && audioRef.current) {
            try {
                console.log('[AudioPlayer] Playing preloaded audio instantly!');
                await audioRef.current.play();
                setIsPlaying(true);
                onSectionChange?.(currentSection);
                return;
            } catch (err) {
                console.error('[AudioPlayer] Play error:', err);
            }
        }

        // Fallback: fetch audio if preload failed or not ready yet
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
                const text = await blob.text();
                console.warn('[AudioPlayer] Blob content:', text);
            }

            const url = URL.createObjectURL(blob);

            if (audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(url);
            setIsPreloaded(true);

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
        onProgressUpdate?.({ sectionIndex: -1, sectionProgress: 0, isPlaying: false });
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
                            : isPreloaded && !isPlaying
                                ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/30 animate-pulse'
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
                {!isLoading && !isPlaying && isPreloaded && (
                    <div className="mt-3 text-green-400 text-sm text-center flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        Ready to play
                    </div>
                )}
                {!isLoading && !isPlaying && !isPreloaded && !error && (
                    <div className="mt-3 text-gray-400 text-sm text-center flex items-center justify-center gap-2">
                        <Loader size={14} className="animate-spin" />
                        Preparing audio...
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
