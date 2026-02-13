import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Loader, Volume2, VolumeX } from 'lucide-react';

// Use direct backend URL for TTS
const API_BASE_URL = 'https://webstorybackend.onrender.com';

// ============ SHARED AUDIO ELEMENT ============
// Single audio element shared between all AudioPlayer instances
let sharedAudio = null;
let sharedAudioCommentary = null; // Track which commentary is loaded
const sharedAudioListeners = new Set(); // Callbacks to notify all instances

function getSharedAudio() {
    if (!sharedAudio) {
        sharedAudio = new Audio();
        sharedAudio.preload = 'auto';

        // Broadcast state changes to all listeners
        sharedAudio.addEventListener('play', () => {
            sharedAudioListeners.forEach(cb => cb({ type: 'play' }));
        });
        sharedAudio.addEventListener('pause', () => {
            sharedAudioListeners.forEach(cb => cb({ type: 'pause' }));
        });
        sharedAudio.addEventListener('ended', () => {
            sharedAudioListeners.forEach(cb => cb({ type: 'ended' }));
        });
        sharedAudio.addEventListener('timeupdate', () => {
            sharedAudioListeners.forEach(cb => cb({
                type: 'timeupdate',
                currentTime: sharedAudio.currentTime,
                duration: sharedAudio.duration
            }));
        });
        sharedAudio.addEventListener('loadedmetadata', () => {
            sharedAudioListeners.forEach(cb => cb({
                type: 'loadedmetadata',
                duration: sharedAudio.duration
            }));
        });
        sharedAudio.addEventListener('progress', () => {
            if (sharedAudio.buffered.length > 0 && sharedAudio.duration) {
                const bufferedEnd = sharedAudio.buffered.end(sharedAudio.buffered.length - 1);
                const bufferPercent = (bufferedEnd / sharedAudio.duration) * 100;
                sharedAudioListeners.forEach(cb => cb({
                    type: 'progress',
                    bufferProgress: bufferPercent
                }));
            }
        });
        sharedAudio.addEventListener('error', (e) => {
            sharedAudioListeners.forEach(cb => cb({ type: 'error', error: e }));
        });
    }
    return sharedAudio;
}

// ============ SHARED AUDIO CACHE (MSE Approach) ============
// This cache stores audio metadata and loading state
const audioCache = new Map(); // commentary -> { audioId, size, duration, status, bufferProgress, listeners }

/**
 * Global preload function - YouTube-style approach:
 * 1. Call /prepare to generate audio and get metadata (audioId, size, duration)
 * 2. Fetch initial chunk (first 20KB) for instant playback
 * 3. Background load the rest
 */
const preloadAudioGlobal = async (commentaryText, audioTitle) => {
    // Check if already cached or loading
    const existing = audioCache.get(commentaryText);
    if (existing && existing.status !== 'error') {
        console.log('[AudioPlayer] Already in cache, status:', existing.status);
        return existing;
    }

    // Create cache entry with estimated duration
    const wordCount = commentaryText.split(/\s+/).length;
    const estimatedDuration = (wordCount / 130) * 60;

    const cacheEntry = {
        status: 'loading',
        bufferProgress: 0,
        duration: estimatedDuration,
        audioId: null,
        size: 0,
        audioUrl: null, // URL for range-based playback
        listeners: new Set()
    };

    audioCache.set(commentaryText, cacheEntry);
    console.log('[AudioPlayer] Starting MSE preload...');

    try {
        // Step 1: Call /prepare to generate audio and get metadata
        console.log('[AudioPlayer] Calling /prepare...');
        const prepareResponse = await fetch(`${API_BASE_URL}/api/tts/prepare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: commentaryText, title: audioTitle })
        });

        if (!prepareResponse.ok) {
            throw new Error(`Prepare failed: ${prepareResponse.status}`);
        }

        const metadata = await prepareResponse.json();
        console.log('[AudioPlayer] Metadata received:', metadata);

        // Update cache with real metadata
        cacheEntry.audioId = metadata.audioId;
        cacheEntry.size = metadata.size;
        cacheEntry.duration = metadata.duration || estimatedDuration;
        cacheEntry.audioUrl = `${API_BASE_URL}/api/tts/audio/${metadata.audioId}`;

        // Notify listeners of duration update
        cacheEntry.listeners.forEach(cb => cb({ ...cacheEntry, status: 'loading' }));

        // Step 2: Fetch initial chunk (first 20KB) to verify audio is accessible
        console.log('[AudioPlayer] Fetching initial chunk...');
        const initialChunkResponse = await fetch(cacheEntry.audioUrl, {
            headers: { 'Range': 'bytes=0-20000' }
        });

        if (!initialChunkResponse.ok && initialChunkResponse.status !== 206) {
            throw new Error(`Initial chunk failed: ${initialChunkResponse.status}`);
        }

        const initialChunk = await initialChunkResponse.arrayBuffer();
        console.log('[AudioPlayer] Initial chunk received:', initialChunk.byteLength, 'bytes');

        // Calculate initial buffer progress
        cacheEntry.bufferProgress = Math.min((initialChunk.byteLength / cacheEntry.size) * 100, 100);

        // Mark as ready - we have enough to start playing
        cacheEntry.status = 'ready';

        // Notify all listeners
        cacheEntry.listeners.forEach(cb => cb(cacheEntry));
        console.log('[AudioPlayer] Preload complete! Audio ready for streaming playback.');

        return cacheEntry;

    } catch (err) {
        console.error('[AudioPlayer] Preload error:', err);
        cacheEntry.status = 'error';
        cacheEntry.error = err.message;

        // Notify listeners of error
        cacheEntry.listeners.forEach(cb => cb(cacheEntry));

        return cacheEntry;
    }
};

// Parse commentary into sections for synced highlighting
const parseCommentaryIntoSections = (text) => {
    if (!text) return [];

    const sections = [];
    const keyPointsMatch = text.match(/Key Points/i);
    const impactMatch = text.match(/Impact Analysis/i);
    const outlookMatch = text.match(/Future Outlook/i);

    if (keyPointsMatch && impactMatch && outlookMatch) {
        sections.push({
            title: 'Key Points',
            content: text.substring(keyPointsMatch.index, impactMatch.index).replace(/Key Points/i, '').trim()
        });
        sections.push({
            title: 'Impact Analysis',
            content: text.substring(impactMatch.index, outlookMatch.index).replace(/Impact Analysis/i, '').trim()
        });
        sections.push({
            title: 'Future Outlook',
            content: text.substring(outlookMatch.index).replace(/Future Outlook/i, '').trim()
        });
    } else {
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
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayer = ({ commentary, title, onSectionChange, onProgressUpdate }) => {
    const playerIdRef = useRef(`audio-player-${Date.now()}-${Math.random()}`);

    // Callback refs
    const onSectionChangeRef = useRef(onSectionChange);
    const onProgressUpdateRef = useRef(onProgressUpdate);
    useEffect(() => {
        onSectionChangeRef.current = onSectionChange;
        onProgressUpdateRef.current = onProgressUpdate;
    }, [onSectionChange, onProgressUpdate]);

    // ============ CORE STATE ============
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [currentSection, setCurrentSection] = useState(0);
    const [error, setError] = useState(null);

    // ============ PRELOAD STATE ============
    const [preloadStatus, setPreloadStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
    const [bufferProgress, setBufferProgress] = useState(0); // 0-100

    // ============ UI STATE ============
    const [isHovered, setIsHovered] = useState(false);

    // ============ REFS ============
    const mountedRef = useRef(true);

    // ============ SHARED AUDIO SYNC ============
    // Sync with shared audio element on mount
    useEffect(() => {
        const audio = getSharedAudio();

        // If this commentary is already loaded in shared audio, sync state
        if (sharedAudioCommentary === commentary) {
            setIsPlaying(!audio.paused);
            setCurrentTime(audio.currentTime || 0);
            if (audio.duration && isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
            setIsMuted(audio.muted);
        }

        // Subscribe to shared audio events
        const handleAudioEvent = (event) => {
            // Only handle events for our commentary
            if (sharedAudioCommentary !== commentary) return;
            if (!mountedRef.current) return;

            switch (event.type) {
                case 'play':
                    setIsPlaying(true);
                    break;
                case 'pause':
                    setIsPlaying(false);
                    break;
                case 'ended':
                    setIsPlaying(false);
                    setCurrentTime(0);
                    setCurrentSection(0);
                    onSectionChangeRef.current?.(-1);
                    break;
                case 'timeupdate':
                    setCurrentTime(event.currentTime || 0);
                    if (event.duration && isFinite(event.duration)) {
                        setDuration(event.duration);
                    }
                    break;
                case 'loadedmetadata':
                    if (event.duration && isFinite(event.duration)) {
                        setDuration(event.duration);
                    }
                    break;
                case 'progress':
                    setBufferProgress(event.bufferProgress || 0);
                    break;
                case 'error':
                    setIsPlaying(false);
                    setError('Audio error');
                    break;
                default:
                    break;
            }
        };

        sharedAudioListeners.add(handleAudioEvent);

        return () => {
            sharedAudioListeners.delete(handleAudioEvent);
        };
    }, [commentary]);

    const sections = useMemo(() => parseCommentaryIntoSections(commentary), [commentary]);

    // ============ SPEECH WEIGHT CALCULATION ============
    const getSpeechWeight = useCallback((text) => {
        if (!text) return 0;
        let weight = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (/[A-Z]/.test(char)) weight += 1.5;
            else if (/[0-9]/.test(char)) weight += 1.2;
            else if ([',', ';', ':'].includes(char)) weight += 3;
            else if (['.', '!', '?'].includes(char)) weight += 6;
            else weight += 1;
        }
        return weight;
    }, []);

    // ============ SECTION TIMESTAMPS ============
    const sectionTimestamps = useMemo(() => {
        if (!sections.length || !duration) return [];

        const PAUSE_WEIGHTS = { TITLE: 25, HEADER: 15 };
        const introText = title ? `${title}. ` : '';
        const outroText = " That wraps up this report.";

        const introWeight = getSpeechWeight(introText) + (introText ? PAUSE_WEIGHTS.TITLE : 0);
        const outroWeight = getSpeechWeight(outroText);

        const sectionsDetails = sections.map(s => {
            const headerWeight = getSpeechWeight(s.title) + PAUSE_WEIGHTS.HEADER;
            const contentWeight = getSpeechWeight(s.content);
            return { headerWeight, contentWeight, totalWeight: headerWeight + contentWeight };
        });

        const sectionsWeight = sectionsDetails.reduce((sum, s) => sum + s.totalWeight, 0);
        const totalWeight = introWeight + sectionsWeight + outroWeight;
        const timePerWeight = duration / totalWeight;
        const introDur = introWeight * timePerWeight;

        let cumulativeWeight = 0;
        return sections.map((section, idx) => {
            const { headerWeight, totalWeight: sectionTotalWeight } = sectionsDetails[idx];
            const start = introDur + (cumulativeWeight * timePerWeight);
            cumulativeWeight += sectionTotalWeight;
            const end = introDur + (cumulativeWeight * timePerWeight);
            const contentStart = start + (headerWeight * timePerWeight);
            return { start, end, index: idx, contentStart };
        });
    }, [sections, duration, title, getSpeechWeight]);

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
    }, [duration, title, sections, getSpeechWeight]);

    // ============ MOUNT/UNMOUNT ============
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            // DON'T stop audio - it's shared and should keep playing
        };
    }, []);

    // ============ GLOBAL STOP EVENT ============
    useEffect(() => {
        const handleStopAllMedia = (e) => {
            if (e.detail?.source === playerIdRef.current) return;
            const audio = getSharedAudio();
            if (!audio.paused) {
                audio.pause();
                setIsPlaying(false);
            }
        };
        window.addEventListener('stopAllMedia', handleStopAllMedia);
        return () => window.removeEventListener('stopAllMedia', handleStopAllMedia);
    }, []);

    // ============ CHECK CACHE & PRELOAD ON MOUNT ============
    useEffect(() => {
        if (!commentary) return;

        // Callback for when preload completes
        const onCacheUpdate = (entry) => {
            if (!mountedRef.current) return;
            setPreloadStatus(entry.status);
            setBufferProgress(entry.bufferProgress || 0);
            if (entry.duration) setDuration(entry.duration);
        };

        // Check if already in cache
        const cached = audioCache.get(commentary);
        if (cached) {
            console.log('[AudioPlayer] Found in cache, status:', cached.status);
            setPreloadStatus(cached.status);
            setBufferProgress(cached.bufferProgress || 100);
            if (cached.duration) setDuration(cached.duration);

            // If still loading, subscribe to updates
            if (cached.status === 'loading') {
                cached.listeners.add(onCacheUpdate);
                return () => cached.listeners.delete(onCacheUpdate);
            }
            return;
        }

        // Start global preload and subscribe
        setPreloadStatus('loading');
        preloadAudioGlobal(commentary, title).then(entry => {
            if (entry && mountedRef.current) {
                onCacheUpdate(entry);
            }
        });

        // Subscribe to updates
        const checkAndSubscribe = () => {
            const entry = audioCache.get(commentary);
            if (entry) {
                entry.listeners.add(onCacheUpdate);
            }
        };

        // Small delay to ensure entry is created
        setTimeout(checkAndSubscribe, 10);

        return () => {
            const entry = audioCache.get(commentary);
            if (entry?.listeners) {
                entry.listeners.delete(onCacheUpdate);
            }
        };
    }, [commentary, title]);


    // ============ PLAY AUDIO ============
    const playAudio = useCallback(async () => {
        const cached = audioCache.get(commentary);
        const audio = getSharedAudio();

        if (!cached?.audioUrl) {
            console.log('[AudioPlayer] No audio URL available');
            return false;
        }

        try {
            window.dispatchEvent(new CustomEvent('stopAllMedia', { detail: { source: playerIdRef.current } }));

            // Only change source if different commentary
            if (sharedAudioCommentary !== commentary) {
                audio.src = cached.audioUrl;
                sharedAudioCommentary = commentary;
                console.log('[AudioPlayer] Loaded new audio source');
            }

            // Set duration immediately (we got it from /prepare)
            if (cached.duration) {
                setDuration(cached.duration);
            }

            await audio.play();
            setIsPlaying(true);
            setError(null);

            console.log('[AudioPlayer] Playback started with shared audio element');
            return true;
        } catch (err) {
            console.error('[AudioPlayer] Play error:', err);
            setError(err.name === 'NotAllowedError' ? 'Tap to play' : 'Playback failed');
            return false;
        }
    }, [commentary]);

    // ============ HANDLE PLAY BUTTON ============
    const handlePlay = useCallback(async () => {
        if (!commentary) {
            setError('No audio available');
            return;
        }

        const audio = getSharedAudio();

        // If this commentary is playing, pause it
        if (sharedAudioCommentary === commentary && !audio.paused) {
            audio.pause();
            setIsPlaying(false);
            return;
        }

        // If a different commentary is playing, stop it first
        if (sharedAudioCommentary !== commentary && !audio.paused) {
            audio.pause();
        }

        // Check cache
        const cached = audioCache.get(commentary);

        // If ready, play immediately
        if (cached?.status === 'ready' && cached?.audioUrl) {
            await playAudio();
            return;
        }

        // If loading, wait and retry
        if (cached?.status === 'loading' || preloadStatus === 'loading') {
            console.log('[AudioPlayer] Waiting for preload to finish...');

            // Subscribe to be notified when ready
            const playWhenReady = (entry) => {
                if (entry?.status === 'ready' && entry?.audioUrl && mountedRef.current) {
                    cached?.listeners?.delete(playWhenReady);
                    playAudio();
                }
            };

            if (cached?.listeners) {
                cached.listeners.add(playWhenReady);
            }

            // Also poll as backup
            const checkReady = setInterval(async () => {
                const c = audioCache.get(commentary);
                if (c?.status === 'ready' && c?.audioUrl && mountedRef.current) {
                    clearInterval(checkReady);
                    await playAudio();
                }
            }, 500);

            // Timeout after 60 seconds
            setTimeout(() => clearInterval(checkReady), 60000);
            return;
        }

        // If idle or error, start preload
        if (!cached || cached.status === 'error') {
            setPreloadStatus('loading');
            const entry = await preloadAudioGlobal(commentary, title);
            if (entry?.status === 'ready' && entry?.audioUrl && mountedRef.current) {
                await playAudio();
            }
        }
    }, [commentary, title, isPlaying, preloadStatus, playAudio]);

    // ============ HANDLE SEEK ============
    const handleSeek = useCallback((e) => {
        const newTime = parseFloat(e.target.value);
        const audio = getSharedAudio();
        if (sharedAudioCommentary === commentary) {
            audio.currentTime = newTime;
            setCurrentTime(newTime);
        }
    }, [commentary]);

    // ============ JUMP TO SECTION ============
    const jumpToSection = useCallback((sectionIndex) => {
        if (!sectionTimestamps[sectionIndex]) return;

        const audio = getSharedAudio();
        const targetTime = sectionTimestamps[sectionIndex].start;

        if (sharedAudioCommentary === commentary) {
            audio.currentTime = targetTime;
            setCurrentTime(targetTime);
            setCurrentSection(sectionIndex);
            onSectionChangeRef.current?.(sectionIndex);

            if (audio.paused) {
                playAudio();
            }
        } else {
            // Load this commentary first, then seek
            playAudio().then(() => {
                audio.currentTime = targetTime;
                setCurrentTime(targetTime);
                setCurrentSection(sectionIndex);
                onSectionChangeRef.current?.(sectionIndex);
            });
        }
    }, [commentary, sectionTimestamps, playAudio]);

    // ============ TOGGLE MUTE ============
    const toggleMute = useCallback(() => {
        const audio = getSharedAudio();
        audio.muted = !isMuted;
        setIsMuted(!isMuted);
    }, [isMuted]);

    // ============ UPDATE SECTION & PROGRESS ============
    useEffect(() => {
        if (duration > 0 && sectionTimestamps.length > 0) {
            const newSection = sectionTimestamps.findIndex(
                ts => currentTime >= ts.start && currentTime < ts.end
            );

            const isInIntro = currentTime < introDuration;

            if (isInIntro) {
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
                const isReadingHeader = currentTime < ts.contentStart;
                const contentDuration = ts.end - ts.contentStart;
                const contentProgress = contentDuration > 0 && !isReadingHeader
                    ? (currentTime - ts.contentStart) / contentDuration
                    : 0;

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

    // ============ RENDER ============
    if (!commentary) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const showGlassEffect = isHovered;

    return (
        <div className="w-full">
            <div
                className={`rounded-xl p-2 sm:p-3 transition-all duration-300 ease-out border
                    ${showGlassEffect
                        ? 'backdrop-blur-md bg-white/15 border-white/25 shadow-lg'
                        : 'bg-transparent backdrop-blur-0 border-transparent shadow-none'}`}
                onTouchStart={() => setIsHovered(true)}
                onTouchEnd={() => setTimeout(() => setIsHovered(false), 3000)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Reporter Info */}
                <div className="flex items-center gap-1.5 sm:gap-3 mb-1.5 sm:mb-3">
                    <div className={`relative flex-shrink-0 transition-all duration-300 ${!showGlassEffect ? 'drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]' : ''}`}>
                        <img
                            src="/images/rachel-anderson.jpeg"
                            alt="Rachel Anderson"
                            className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full object-cover transition-all duration-300 border-2 ${showGlassEffect ? 'border-blue-500 shadow-lg' : 'border-white/50 shadow-xl'}`}
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

                    <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-[10px] sm:text-sm leading-tight transition-all duration-300 text-white ${!showGlassEffect ? '[text-shadow:_0_2px_8px_rgb(0_0_0_/_90%),_0_1px_3px_rgb(0_0_0_/_100%)]' : ''}`}>
                            Rachel Anderson
                        </h3>
                        <p className={`text-[8px] sm:text-[10px] font-medium uppercase tracking-wider truncate transition-all duration-300 ${!showGlassEffect ? 'text-blue-300 [text-shadow:_0_2px_8px_rgb(0_0_0_/_90%),_0_1px_3px_rgb(0_0_0_/_100%)]' : 'text-blue-400'}`}>
                            Senior Forexyy Reporter
                        </p>
                    </div>

                    {isPlaying && (
                        <div className="flex items-center gap-1 bg-red-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="text-red-400 text-[8px] sm:text-[10px] font-bold uppercase">Live</span>
                        </div>
                    )}
                </div>

                {/* Section Buttons - Desktop */}
                {sections.length > 1 && (
                    <div className="hidden sm:flex mb-1.5 gap-1">
                        {sections.map((section, idx) => (
                            <button
                                key={idx}
                                onClick={() => jumpToSection(idx)}
                                disabled={preloadStatus !== 'ready'}
                                aria-label={`Jump to ${section.title}`}
                                className={`flex-1 text-center py-1 px-1 rounded text-[9px] font-medium transition-all cursor-pointer
                                    ${idx === currentSection
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : idx < currentSection
                                            ? 'bg-white/20 text-blue-200 hover:bg-white/30'
                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                    }
                                    ${preloadStatus !== 'ready' ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                                `}
                            >
                                {section.title}
                            </button>
                        ))}
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Play Button */}
                    <button
                        onClick={handlePlay}
                        aria-label={isPlaying ? 'Pause audio' : preloadStatus === 'loading' ? 'Loading audio' : 'Play AI commentary'}
                        className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-300 flex-shrink-0 touch-manipulation ${
                            isPlaying
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                                : preloadStatus === 'ready'
                                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/30'
                                    : preloadStatus === 'loading'
                                        ? 'bg-gradient-to-r from-yellow-600 to-orange-500 text-white shadow-lg shadow-orange-500/30 animate-pulse'
                                        : 'bg-gradient-to-r from-gray-600 to-gray-500 text-white'
                        }`}
                    >
                        {preloadStatus === 'loading' && !isPlaying ? (
                            <Loader size={18} className="animate-spin" />
                        ) : isPlaying ? (
                            <Pause size={18} fill="currentColor" />
                        ) : (
                            <Play size={18} fill="currentColor" className="ml-0.5" />
                        )}
                    </button>

                    {/* Seekbar */}
                    <div className="flex-1 min-w-0">
                        <div className={`relative h-2 rounded-full overflow-visible transition-all duration-300 ${showGlassEffect ? 'bg-white/20' : 'bg-transparent border border-white/50 shadow-[0_2px_10px_rgba(0,0,0,0.9)]'}`}>
                            {/* Buffer Progress (gray) */}
                            <div
                                className="absolute top-0 left-0 h-full bg-gray-500/50 rounded-full transition-all duration-300"
                                style={{ width: `${bufferProgress}%` }}
                            />

                            {/* Playback Progress (blue) */}
                            <div
                                className={`absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-75 ${!showGlassEffect ? 'shadow-[0_0_8px_rgba(59,130,246,0.8)]' : ''}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />

                            {/* Section Markers */}
                            {duration > 0 && sectionTimestamps.map((ts, idx) => (
                                idx > 0 && (
                                    <div
                                        key={idx}
                                        onClick={() => preloadStatus === 'ready' && jumpToSection(idx)}
                                        className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-yellow-400 rounded-full hover:scale-150 transition-transform z-10"
                                        style={{
                                            left: `${(ts.start / duration) * 100}%`,
                                            cursor: preloadStatus === 'ready' ? 'pointer' : 'default'
                                        }}
                                        title={`Jump to ${sections[idx]?.title}`}
                                    />
                                )
                            ))}

                            {/* Seek Input */}
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                step="0.1"
                                value={currentTime || 0}
                                onChange={handleSeek}
                                className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-8 sm:h-full opacity-0 cursor-pointer z-20 touch-manipulation"
                                disabled={preloadStatus !== 'ready'}
                            />
                        </div>

                        {/* Time Display */}
                        <div className="flex justify-between mt-1 px-0.5">
                            <span className={`text-[10px] sm:text-xs font-mono tabular-nums transition-all duration-300 ${showGlassEffect ? 'text-white/80' : 'text-white [text-shadow:_0_2px_8px_rgb(0_0_0_/_90%)]'}`}>
                                {formatTime(currentTime)}
                            </span>
                            <span className={`text-[10px] sm:text-xs font-mono tabular-nums transition-all duration-300 ${preloadStatus === 'loading' ? 'text-yellow-400' : ''} ${showGlassEffect ? 'text-white/50' : 'text-white/80 [text-shadow:_0_2px_8px_rgb(0_0_0_/_90%)]'}`}>
                                {preloadStatus === 'loading' && bufferProgress < 100 ? `~${formatTime(duration)}` : formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    {/* Mute Button */}
                    <button
                        onClick={toggleMute}
                        aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                        className={`p-2 sm:p-1.5 hover:text-white active:text-blue-400 transition-all duration-300 flex-shrink-0 touch-manipulation ${showGlassEffect ? 'text-gray-400' : 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'}`}
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="mt-1.5 sm:mt-2 text-center">
                        <span className="text-orange-400 text-[9px] sm:text-[10px]">{error}</span>
                    </div>
                )}

                {preloadStatus === 'loading' && bufferProgress < 100 && (
                    <div className="mt-1.5 text-center">
                        <span className="text-blue-400 text-[9px] sm:text-[10px]">
                            Loading {Math.round(bufferProgress)}%
                        </span>
                    </div>
                )}

                {/* Audio element is now shared globally - no local element needed */}
            </div>
        </div>
    );
};

export default AudioPlayer;
