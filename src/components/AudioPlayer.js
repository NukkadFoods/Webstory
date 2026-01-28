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

const AudioPlayer = ({ commentary, title, onSectionChange, onProgressUpdate, autoplay = true }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const playerIdRef = useRef(`audio-player-${Date.now()}`);
    const autoplayAttemptedRef = useRef(false);

    // Listen for global stop event (when another media starts playing)
    useEffect(() => {
        const handleStopAllMedia = (e) => {
            // Don't stop if this player fired the event
            if (e.detail?.source === playerIdRef.current) return;

            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
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
        autoplayAttemptedRef.current = false;
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

                // Set audio source and WAIT for it to be ready to play
                if (audioRef.current) {
                    audioRef.current.src = url;

                    // Wait for audio to be buffered and ready to play instantly
                    await new Promise((resolve, reject) => {
                        const audio = audioRef.current;
                        if (!audio) {
                            reject(new Error('Audio element not available'));
                            return;
                        }

                        const onCanPlayThrough = () => {
                            audio.removeEventListener('canplaythrough', onCanPlayThrough);
                            audio.removeEventListener('error', onError);
                            console.log('[AudioPlayer] Audio buffered and ready!');
                            resolve();
                        };

                        const onError = (e) => {
                            audio.removeEventListener('canplaythrough', onCanPlayThrough);
                            audio.removeEventListener('error', onError);
                            reject(new Error('Audio load error'));
                        };

                        // Check if already ready (readyState 4 = HAVE_ENOUGH_DATA)
                        if (audio.readyState >= 4) {
                            console.log('[AudioPlayer] Audio already buffered');
                            resolve();
                            return;
                        }

                        audio.addEventListener('canplaythrough', onCanPlayThrough);
                        audio.addEventListener('error', onError);

                        // Force load
                        audio.load();
                    });
                }

                setIsPreloaded(true);
                console.log('[AudioPlayer] Audio preloaded and ready to play instantly!');
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

    // Autoplay when audio is preloaded (helps new users discover the feature)
    useEffect(() => {
        if (!autoplay || !isPreloaded || autoplayAttemptedRef.current) return;
        if (!audioRef.current || isPlaying) return;

        autoplayAttemptedRef.current = true;

        const attemptAutoplay = async () => {
            try {
                // Stop any other playing media first
                window.dispatchEvent(new CustomEvent('stopAllMedia', { detail: { source: playerIdRef.current } }));

                console.log('[AudioPlayer] Attempting autoplay...');
                await audioRef.current.play();
                setIsPlaying(true);
                onSectionChange?.(0);
                console.log('[AudioPlayer] Autoplay successful!');
            } catch (err) {
                // Autoplay was blocked by browser policy - this is normal
                console.log('[AudioPlayer] Autoplay blocked by browser:', err.name);
                // Don't show error - user can click play manually
            }
        };

        // Small delay to ensure everything is ready
        const timer = setTimeout(attemptAutoplay, 300);
        return () => clearTimeout(timer);
    }, [autoplay, isPreloaded, isPlaying, onSectionChange]);

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

        // If audio is preloaded and ready, play instantly
        if (audioUrl && audioRef.current && isPreloaded) {
            try {
                // Stop any other playing media first
                window.dispatchEvent(new CustomEvent('stopAllMedia', { detail: { source: playerIdRef.current } }));

                console.log('[AudioPlayer] Playing preloaded audio instantly!');
                await audioRef.current.play();
                setIsPlaying(true);
                onSectionChange?.(currentSection);
                return;
            } catch (err) {
                console.error('[AudioPlayer] Play error:', err);
                // If autoplay was blocked, show error instead of re-fetching
                if (err.name === 'NotAllowedError') {
                    setError('Please interact with the page first to enable audio');
                    return;
                }
                // For other errors, continue to fallback fetch
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
                // Stop any other playing media first
                window.dispatchEvent(new CustomEvent('stopAllMedia', { detail: { source: playerIdRef.current } }));

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
        <div className="w-full">
            {/* Main Player Card - Compact */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-3 shadow-xl border border-gray-700">

                {/* Reporter Info Row - Compact */}
                <div className="flex items-center gap-3 mb-3">
                    {/* Avatar - Smaller */}
                    <div className="relative flex-shrink-0">
                        <img
                            src="/images/rachel-anderson.jpeg"
                            alt="Rachel Anderson"
                            className="w-10 h-10 rounded-full object-cover shadow-lg border-2 border-blue-500"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white font-bold text-sm shadow-lg hidden">
                            RA
                        </div>
                        {isPlaying && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></span>
                        )}
                    </div>

                    {/* Name & Title - Compact */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm leading-tight">
                            Rachel Anderson
                        </h3>
                        <p className="text-blue-400 text-[10px] font-medium uppercase tracking-wider truncate">
                            Senior Forexyy Reporter
                        </p>
                    </div>

                    {/* Live Badge */}
                    {isPlaying && (
                        <div className="flex items-center gap-1.5 bg-red-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="text-red-400 text-[10px] font-bold uppercase">Live</span>
                        </div>
                    )}
                </div>

                {/* Clickable Section Buttons - Compact */}
                {sections.length > 1 && (
                    <div className="mb-2 flex gap-1.5">
                        {sections.map((section, idx) => (
                            <button
                                key={idx}
                                onClick={() => jumpToSection(idx)}
                                disabled={!audioUrl}
                                className={`flex-1 text-center py-1.5 px-1.5 rounded-md text-[10px] font-medium transition-all cursor-pointer
                                    ${idx === currentSection
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
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

                {/* Controls Row - Compact */}
                <div className="flex items-center gap-3">
                    {/* Play/Pause Button - Smaller */}
                    <button
                        onClick={handlePlay}
                        disabled={isLoading || (!isPreloaded && !isPlaying)}
                        className={`flex items-center justify-center w-11 h-11 rounded-full transition-all flex-shrink-0 ${
                            isLoading || (!isPreloaded && !isPlaying && !error)
                                ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                : isPreloaded && !isPlaying
                                    ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/30 animate-pulse'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30'
                        }`}
                    >
                        {isLoading || (!isPreloaded && !isPlaying && !error) ? (
                            <Loader size={20} className="animate-spin" />
                        ) : isPlaying ? (
                            <Pause size={20} fill="currentColor" />
                        ) : (
                            <Play size={20} fill="currentColor" className="ml-0.5" />
                        )}
                    </button>

                    {/* Seekbar & Time */}
                    <div className="flex-1">
                        {/* Seekbar with Section Markers */}
                        <div className="relative h-2 bg-gray-700 rounded-full overflow-visible">
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
                                        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-gray-900 hover:scale-125 transition-transform z-10 cursor-pointer"
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
                        <div className="flex justify-between mt-0.5">
                            <span className="text-gray-400 text-[10px] font-mono">
                                {formatTime(currentTime)}
                            </span>
                            <span className="text-gray-500 text-[10px] font-mono">
                                {formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    {/* Mute Button */}
                    <button
                        onClick={toggleMute}
                        className="p-1.5 text-gray-400 hover:text-white transition flex-shrink-0"
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>

                {/* Status Message - Compact inline */}
                {(error || isLoading || (!isPlaying && !isPreloaded)) && (
                    <div className="mt-2 text-center">
                        {error && (
                            <span className="text-red-400 text-[10px]">{error}</span>
                        )}
                        {isLoading && (
                            <span className="text-blue-400 text-[10px]">Generating audio...</span>
                        )}
                        {!isLoading && !isPlaying && !isPreloaded && !error && (
                            <span className="text-gray-400 text-[10px] flex items-center justify-center gap-1">
                                <Loader size={10} className="animate-spin" />
                                Preparing audio...
                            </span>
                        )}
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
                    preload="auto"
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default AudioPlayer;
