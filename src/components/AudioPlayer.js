import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Loader, Volume2, VolumeX } from 'lucide-react';

// Use direct backend URL for TTS
const API_BASE_URL = 'https://webstorybackend.onrender.com';

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

const AudioPlayer = ({ commentary, title, onSectionChange, onProgressUpdate, autoplay = false }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isHovered, setIsHovered] = useState(false); // Track hover/touch for glass effect
    const playerIdRef = useRef(`audio-player-${Date.now()}`);
    const autoplayAttemptedRef = useRef(false);

    // Use refs for callbacks to avoid dependency issues
    const onSectionChangeRef = useRef(onSectionChange);
    const onProgressUpdateRef = useRef(onProgressUpdate);
    useEffect(() => {
        onSectionChangeRef.current = onSectionChange;
        onProgressUpdateRef.current = onProgressUpdate;
    }, [onSectionChange, onProgressUpdate]);

    // Listen for global stop event (when another media starts playing)
    useEffect(() => {
        const handleStopAllMedia = (e) => {
            // Don't stop if this player fired the event
            if (e.detail?.source === playerIdRef.current) return;

            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
                // Stop the interval directly via ref
                if (timeUpdateIntervalRef.current) {
                    clearInterval(timeUpdateIntervalRef.current);
                    timeUpdateIntervalRef.current = null;
                }
                setIsPlaying(false);
            }
        };

        window.addEventListener('stopAllMedia', handleStopAllMedia);
        return () => window.removeEventListener('stopAllMedia', handleStopAllMedia);
    }, []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [currentSection, setCurrentSection] = useState(0);
    const [isPreloaded, setIsPreloaded] = useState(false);
    const [hasFullAudio, setHasFullAudio] = useState(false); // Track if we have complete audio
    const [isStreaming, setIsStreaming] = useState(false); // Track if we're in streaming mode
    const preloadStartedRef = useRef(false);
    const abortControllerRef = useRef(null);
    const timeUpdateIntervalRef = useRef(null); // Ref-based interval for immediate time updates

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
        // Clear interval directly via ref (function not yet defined at this point)
        if (timeUpdateIntervalRef.current) {
            clearInterval(timeUpdateIntervalRef.current);
            timeUpdateIntervalRef.current = null;
        }
        setError(null);
        setAudioUrl(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setCurrentSection(0);
        setIsPreloaded(false);
        setHasFullAudio(false);
        setIsStreaming(false);
        preloadStartedRef.current = false;
        autoplayAttemptedRef.current = false;
    }, [commentary]);

    // Set up audio - ready for streaming playback on demand
    useEffect(() => {
        if (!commentary || preloadStartedRef.current) return;

        preloadStartedRef.current = true;
        console.log('[AudioPlayer] Ready for streaming playback');

        // Don't set isPreloaded here - wait until we have actual audio
        // This prevents the autoplay effect from triggering prematurely
    }, [commentary]);

    // Autoplay disabled - user must click play to start
    // This prevents race conditions where autoplay conflicts with manual play clicks

    // Update current section and progress based on audio progress
    // Works during streaming using estimated duration if needed
    useEffect(() => {
        if (duration > 0 && sectionTimestamps.length > 0) {
            const newSection = sectionTimestamps.findIndex(
                ts => currentTime >= ts.start && currentTime < ts.end
            );

            const isInIntro = currentTime < introDuration;

            if (isInIntro) {
                // Still reading title/intro - no highlighting
                onProgressUpdateRef.current?.({
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
                    onSectionChangeRef.current?.(newSection);
                }

                const ts = sectionTimestamps[newSection];

                // Check if still reading section header
                const isReadingHeader = currentTime < ts.contentStart;

                // Calculate progress within content only (not header)
                const contentDuration = ts.end - ts.contentStart;
                const contentProgress = contentDuration > 0 && !isReadingHeader
                    ? (currentTime - ts.contentStart) / contentDuration
                    : 0;

                // Report progress to parent for word highlighting
                onProgressUpdateRef.current?.({
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
    }, [currentTime, duration, sectionTimestamps, introDuration, currentSection, isPlaying]);

    const handleTimeUpdate = useCallback(() => {
        if (audioRef.current) {
            const time = audioRef.current.currentTime;
            setCurrentTime(time);
        }
    }, []);

    // Start time update interval immediately (ref-based, not dependent on state)
    const startTimeUpdateInterval = useCallback(() => {
        // Clear any existing interval
        if (timeUpdateIntervalRef.current) {
            clearInterval(timeUpdateIntervalRef.current);
        }

        // Start new interval immediately
        timeUpdateIntervalRef.current = setInterval(() => {
            if (audioRef.current) {
                const time = audioRef.current.currentTime;
                setCurrentTime(time);

                // Also update duration if it changed (streaming)
                const dur = audioRef.current.duration;
                if (dur && isFinite(dur) && dur > 0) {
                    setDuration(prev => {
                        // Only update if significantly different
                        return Math.abs(dur - prev) > 0.5 ? dur : prev;
                    });
                }
            }
        }, 50); // Update 20 times per second for very smooth progress
    }, []);

    const stopTimeUpdateInterval = useCallback(() => {
        if (timeUpdateIntervalRef.current) {
            clearInterval(timeUpdateIntervalRef.current);
            timeUpdateIntervalRef.current = null;
        }
    }, []);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            stopTimeUpdateInterval();
        };
    }, [stopTimeUpdateInterval]);

    // Also sync interval with isPlaying state as a backup
    useEffect(() => {
        if (isPlaying) {
            startTimeUpdateInterval();
        } else {
            stopTimeUpdateInterval();
        }
    }, [isPlaying, startTimeUpdateInterval, stopTimeUpdateInterval]);

    const handleLoadedMetadata = useCallback(() => {
        if (audioRef.current) {
            const dur = audioRef.current.duration;
            // Only update if we get a valid finite duration (not from partial blob)
            if (dur && isFinite(dur) && dur > 0) {
                setDuration(dur);
                console.log('[AudioPlayer] Got real duration from metadata:', dur);
            }
        }
    }, []);

    // Also listen for durationchange event for streaming audio
    const handleDurationChange = useCallback(() => {
        if (audioRef.current) {
            const dur = audioRef.current.duration;
            if (dur && isFinite(dur) && dur > 0) {
                setDuration(dur);
                console.log('[AudioPlayer] Duration changed:', dur);
            }
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
        onSectionChangeRef.current?.(sectionIndex);

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

        // If already playing, pause (use isPlaying state for reliability during streaming)
        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            stopTimeUpdateInterval();
            setIsPlaying(false);
            return;
        }

        // If audio URL already exists, just play it
        if (audioUrl && audioRef.current) {
            try {
                window.dispatchEvent(new CustomEvent('stopAllMedia', { detail: { source: playerIdRef.current } }));
                await audioRef.current.play();
                // Start interval IMMEDIATELY on resume
                startTimeUpdateInterval();
                setIsPlaying(true);
                onSectionChangeRef.current?.(currentSection);
                return;
            } catch (err) {
                if (err.name === 'NotAllowedError') {
                    setError('Tap again to play');
                    return;
                }
            }
        }

        // Stream audio with early playback
        setIsLoading(true);
        setError(null);
        setIsStreaming(true);

        // Set estimated duration IMMEDIATELY so UI is ready
        const wordCount = commentary.split(/\s+/).length;
        const estimatedDuration = (wordCount / 120) * 60; // ~120 words/min TTS
        setDuration(estimatedDuration);
        console.log('[AudioPlayer] Set estimated duration:', estimatedDuration, 'seconds for', wordCount, 'words');

        try {
            console.log('[AudioPlayer] Starting streaming fetch...');

            const response = await fetch(`${API_BASE_URL}/api/tts/speak`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: commentary, title })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            // Use streaming to start playback faster
            const reader = response.body.getReader();
            const chunks = [];
            let firstChunkPlayed = false;

            const processStream = async () => {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        console.log('[AudioPlayer] Stream complete, total chunks:', chunks.length);
                        break;
                    }

                    chunks.push(value);

                    // Start playback after receiving ~20KB (enough for ~1-2 seconds of audio)
                    const totalSize = chunks.reduce((acc, c) => acc + c.length, 0);

                    if (!firstChunkPlayed && totalSize > 20000) {
                        console.log('[AudioPlayer] Starting early playback at', totalSize, 'bytes');
                        firstChunkPlayed = true;

                        // Create blob from chunks received so far
                        const partialBlob = new Blob(chunks, { type: 'audio/mpeg' });
                        const url = URL.createObjectURL(partialBlob);

                        if (audioUrl) URL.revokeObjectURL(audioUrl);
                        setAudioUrl(url);

                        if (audioRef.current) {
                            window.dispatchEvent(new CustomEvent('stopAllMedia', { detail: { source: playerIdRef.current } }));
                            audioRef.current.src = url;

                            try {
                                await audioRef.current.play();
                                // Start interval IMMEDIATELY (don't wait for state update)
                                startTimeUpdateInterval();
                                setIsPlaying(true);
                                setIsLoading(false);
                                setCurrentSection(0);
                                setCurrentTime(0); // Reset to 0 for fresh start
                                onSectionChangeRef.current?.(0);
                            } catch (playErr) {
                                console.error('[AudioPlayer] Early play failed:', playErr);
                                setIsLoading(false);
                            }
                        }
                    }
                }

                // After stream completes, update with full audio
                const fullBlob = new Blob(chunks, { type: 'audio/mpeg' });
                const fullUrl = URL.createObjectURL(fullBlob);
                console.log('[AudioPlayer] Full audio ready:', fullBlob.size, 'bytes');
                setIsStreaming(false);

                // Only update if we started early playback
                if (firstChunkPlayed && audioRef.current) {
                    const savedTime = audioRef.current.currentTime;
                    const wasPlaying = !audioRef.current.paused;

                    if (audioUrl) URL.revokeObjectURL(audioUrl);
                    setAudioUrl(fullUrl);
                    audioRef.current.src = fullUrl;

                    // Wait for the new source to be ready before seeking
                    audioRef.current.onloadeddata = () => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = savedTime;
                            if (wasPlaying) {
                                audioRef.current.play().catch(() => {});
                            }
                        }
                    };
                } else if (!firstChunkPlayed) {
                    // If we never started early, start now with full audio
                    if (audioUrl) URL.revokeObjectURL(audioUrl);
                    setAudioUrl(fullUrl);

                    if (audioRef.current) {
                        window.dispatchEvent(new CustomEvent('stopAllMedia', { detail: { source: playerIdRef.current } }));
                        audioRef.current.src = fullUrl;
                        await audioRef.current.play();
                        // Start interval IMMEDIATELY
                        startTimeUpdateInterval();
                        setIsPlaying(true);
                        setCurrentSection(0);
                        setCurrentTime(0);
                        onSectionChangeRef.current?.(0);
                    }
                    setIsLoading(false);
                }

                setIsPreloaded(true);
                setHasFullAudio(true); // Now safe to show progress/highlighting
            };

            processStream().catch(err => {
                console.error('[AudioPlayer] Stream processing error:', err);
                setError('Streaming failed');
                setIsLoading(false);
                setIsStreaming(false);
            });

        } catch (err) {
            console.error('[AudioPlayer] Error:', err);
            setError(err.message || 'Playback failed');
            setIsLoading(false);
            setIsStreaming(false);
            stopTimeUpdateInterval();
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleEnded = () => {
        stopTimeUpdateInterval();
        setIsPlaying(false);
        setCurrentSection(0);
        setCurrentTime(0);
        onSectionChangeRef.current?.(-1);
        onProgressUpdateRef.current?.({ sectionIndex: -1, sectionProgress: 0, isPlaying: false });
    };

    if (!commentary) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Show glass effect when hovered or touched - MOBILE ONLY
    const showGlassEffect = isHovered;

    return (
        <div className="w-full">
            {/* Main Player Card
                - MOBILE: 100% transparent by default, glass effect on touch
                - DESKTOP: Always has solid background */}
            <div
                className={`rounded-xl p-2 sm:p-3 transition-all duration-300 ease-out
                    sm:bg-gradient-to-br sm:from-gray-900 sm:via-gray-800 sm:to-gray-900 sm:shadow-xl sm:border sm:border-gray-700
                    ${showGlassEffect ? 'bg-black/60 backdrop-blur-xl shadow-2xl border border-white/20' : 'max-sm:bg-transparent max-sm:border-0 max-sm:shadow-none'}`}
                style={!showGlassEffect ? { } : {}}
                onTouchStart={() => setIsHovered(true)}
                onTouchEnd={() => setTimeout(() => setIsHovered(false), 3000)}
            >

                {/* Reporter Info Row - Very Compact on Mobile */}
                <div className="flex items-center gap-1.5 sm:gap-3 mb-1.5 sm:mb-3">
                    {/* Avatar - Smaller on mobile */}
                    <div className={`relative flex-shrink-0 transition-all duration-300 ${!showGlassEffect ? 'max-sm:drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]' : ''}`}>
                        <img
                            src="/images/rachel-anderson.jpeg"
                            alt="Rachel Anderson"
                            className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full object-cover transition-all duration-300 border-2 sm:border-blue-500 sm:shadow-lg ${showGlassEffect ? 'border-blue-500 shadow-lg' : 'max-sm:border-white/50 max-sm:shadow-xl'}`}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white font-bold text-[10px] sm:text-sm shadow-lg hidden">
                            RA
                        </div>
                        {isPlaying && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full border border-gray-900 animate-pulse"></span>
                        )}
                    </div>

                    {/* Name & Title - Compact on Mobile */}
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-[10px] sm:text-sm leading-tight transition-all duration-300 text-white ${!showGlassEffect ? 'max-sm:[text-shadow:_0_2px_8px_rgb(0_0_0_/_90%),_0_1px_3px_rgb(0_0_0_/_100%)]' : ''}`}>
                            Rachel Anderson
                        </h3>
                        <p className={`text-[8px] sm:text-[10px] font-medium uppercase tracking-wider truncate transition-all duration-300 text-blue-400 ${!showGlassEffect ? 'max-sm:text-blue-300 max-sm:[text-shadow:_0_2px_8px_rgb(0_0_0_/_90%),_0_1px_3px_rgb(0_0_0_/_100%)]' : ''}`}>
                            Senior Forexyy Reporter
                        </p>
                    </div>

                    {/* Live Badge */}
                    {isPlaying && (
                        <div className="flex items-center gap-1 bg-red-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="text-red-400 text-[8px] sm:text-[10px] font-bold uppercase">Live</span>
                        </div>
                    )}
                </div>

                {/* Clickable Section Buttons - Hidden on mobile, compact on desktop */}
                {sections.length > 1 && (
                    <div className="hidden sm:flex mb-1.5 gap-1">
                        {sections.map((section, idx) => (
                            <button
                                key={idx}
                                onClick={() => jumpToSection(idx)}
                                disabled={!audioUrl}
                                className={`flex-1 text-center py-1 px-1 rounded text-[9px] font-medium transition-all cursor-pointer
                                    ${idx === currentSection
                                        ? 'bg-blue-600 text-white'
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

                {/* Controls Row - Compact on Mobile */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Play/Pause Button - Compact on mobile */}
                    <button
                        onClick={handlePlay}
                        disabled={isLoading && !isPlaying}
                        className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-300 flex-shrink-0 touch-manipulation ${
                            isLoading && !isPlaying
                                ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                : isPlaying
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 active:from-blue-700 active:to-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : isPreloaded
                                        ? 'bg-gradient-to-r from-green-600 to-green-500 active:from-green-700 active:to-green-600 text-white shadow-lg shadow-green-500/30 animate-pulse'
                                        : 'bg-gradient-to-r from-yellow-600 to-orange-500 active:from-yellow-700 active:to-orange-600 text-white sm:shadow-lg sm:shadow-orange-500/30 max-sm:shadow-[0_4px_15px_rgba(0,0,0,0.8)]'
                        }`}
                    >
                        {isLoading && !isPlaying ? (
                            <Loader size={18} className="animate-spin" />
                        ) : isPlaying ? (
                            <Pause size={18} fill="currentColor" />
                        ) : (
                            <Play size={18} fill="currentColor" className="ml-0.5" />
                        )}
                    </button>

                    {/* Seekbar & Time */}
                    <div className="flex-1 min-w-0">
                        {/* Seekbar - Mobile: outline when transparent, Desktop: always filled */}
                        <div className={`relative h-2 sm:h-2 rounded-full overflow-visible transition-all duration-300 sm:bg-gray-700 ${showGlassEffect ? 'bg-white/20' : 'max-sm:bg-transparent max-sm:border max-sm:border-white/50 max-sm:shadow-[0_2px_10px_rgba(0,0,0,0.9)]'}`}>
                            {/* Progress Fill */}
                            <div
                                className={`absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-100 ${isStreaming ? 'opacity-80' : ''} ${!showGlassEffect ? 'max-sm:shadow-[0_0_8px_rgba(59,130,246,0.8)]' : ''}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />

                            {/* Section Markers (Yellow) - Small dots on all screens */}
                            {duration > 0 && sectionTimestamps.map((ts, idx) => (
                                idx > 0 && (
                                    <div
                                        key={idx}
                                        onClick={() => audioUrl && jumpToSection(idx)}
                                        className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-yellow-400 rounded-full hover:scale-150 transition-transform z-10"
                                        style={{
                                            left: `${(ts.start / duration) * 100}%`,
                                            cursor: audioUrl ? 'pointer' : 'default'
                                        }}
                                        title={`Jump to ${sections[idx]?.title}`}
                                    />
                                )
                            ))}

                            {/* Range Input (invisible but functional) - Taller on mobile for easier touch */}
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                step="0.1"
                                value={currentTime || 0}
                                onChange={handleSeek}
                                className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-8 sm:h-full opacity-0 cursor-pointer z-20 touch-manipulation"
                                disabled={!audioUrl}
                            />
                        </div>

                        {/* Timestamps */}
                        <div className="flex justify-between mt-1 px-0.5">
                            <span className={`text-[10px] sm:text-xs font-mono tabular-nums transition-all duration-300 sm:text-gray-400 ${showGlassEffect ? 'text-white/80' : 'max-sm:text-white max-sm:[text-shadow:_0_2px_8px_rgb(0_0_0_/_90%)]'}`}>
                                {formatTime(currentTime)}
                            </span>
                            <span className={`text-[10px] sm:text-xs font-mono tabular-nums transition-all duration-300 ${isStreaming ? 'text-yellow-400 max-sm:[text-shadow:_0_2px_8px_rgb(0_0_0_/_90%)]' : showGlassEffect ? 'text-white/50' : 'sm:text-gray-500 max-sm:text-white/80 max-sm:[text-shadow:_0_2px_8px_rgb(0_0_0_/_90%)]'}`}>
                                {isStreaming ? `~${formatTime(duration)}` : formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    {/* Mute Button - Larger touch target on mobile */}
                    <button
                        onClick={toggleMute}
                        className={`p-2 sm:p-1.5 hover:text-white active:text-blue-400 transition-all duration-300 flex-shrink-0 touch-manipulation sm:text-gray-400 ${showGlassEffect ? 'text-gray-400' : 'max-sm:text-white max-sm:drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'}`}
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>

                {/* Status Message - Compact inline & Mobile Optimized */}
                {(error || isLoading) && (
                    <div className="mt-1.5 sm:mt-2 text-center">
                        {error && (
                            <span className="text-orange-400 text-[9px] sm:text-[10px]">{error}</span>
                        )}
                        {isLoading && !error && (
                            <span className="text-blue-400 text-[9px] sm:text-[10px]">Generating audio...</span>
                        )}
                    </div>
                )}

                {/* Hidden Audio Element */}
                <audio
                    ref={audioRef}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onDurationChange={handleDurationChange}
                    onEnded={handleEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => {
                        setIsLoading(false);
                        setIsPlaying(false);
                        setError('Audio playback error');
                    }}
                    preload="auto"
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default AudioPlayer;
