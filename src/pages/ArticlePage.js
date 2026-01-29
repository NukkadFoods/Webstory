import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getArticleById } from '../services/articleService';
import { getWallStreetArticleByUrl } from '../services/wallStreetService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faUser, faTag, faArrowLeft, faShare, faBookmark, faExclamationTriangle, faBolt, faChartLine, faRobot, faGlobeAmericas, faSearch, faPlay, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import { faTwitter, faFacebook } from '@fortawesome/free-brands-svg-icons';
import Header from '../components/Header';
import RelatedArticles from '../components/RelatedArticles';
import ReelsSidebar from '../components/ReelsSidebar';
import FluidAd from '../components/FluidAd';
import AudioPlayer from '../components/AudioPlayer';

const ArticlePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [isWallStreetArticle, setIsWallStreetArticle] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [displayedCommentary, setDisplayedCommentary] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [audioSection, setAudioSection] = useState(-1); // -1 = not playing, 0+ = section index
  const [audioProgress, setAudioProgress] = useState({ sectionIndex: -1, sectionProgress: 0, isPlaying: false });
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [showReels, setShowReels] = useState(false);

  // Refs for auto-scroll functionality
  const highlightedWordRef = useRef(null);
  const commentaryContainerRef = useRef(null);
  const commentaryScrollRef = useRef(null); // Scrollable container for commentary

  // Auto-scroll to highlighted word when audio is playing - ONLY within commentary container
  const scrollToHighlightedWord = useCallback(() => {
    if (!autoScrollEnabled || !audioProgress.isPlaying) return;

    const scrollContainer = commentaryScrollRef.current;
    if (!scrollContainer) return;

    // Try ref first, then fallback to querySelector within the container
    let highlightedEl = highlightedWordRef.current;
    if (!highlightedEl) {
      highlightedEl = scrollContainer.querySelector('[data-highlighted="true"]');
    }

    if (!highlightedEl) return;

    // Calculate position relative to scroll container
    const containerRect = scrollContainer.getBoundingClientRect();
    const highlightRect = highlightedEl.getBoundingClientRect();

    // Get the element's position relative to the scroll container
    const relativeTop = highlightRect.top - containerRect.top + scrollContainer.scrollTop;

    // Scroll to center the highlighted word in the container
    const targetScroll = relativeTop - (containerRect.height / 2) + (highlightRect.height / 2);

    scrollContainer.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    });
  }, [autoScrollEnabled, audioProgress.isPlaying]);

  // Trigger auto-scroll when audio progress updates
  useEffect(() => {
    if (audioProgress.isPlaying && autoScrollEnabled && audioProgress.contentProgress > 0) {
      // Small delay to let DOM update with new highlighted word
      const timer = setTimeout(scrollToHighlightedWord, 50);
      return () => clearTimeout(timer);
    }
  }, [audioProgress.contentProgress, audioProgress.isPlaying, autoScrollEnabled, scrollToHighlightedWord]);

  // Interval-based scroll as backup (every 500ms while playing)
  useEffect(() => {
    if (!audioProgress.isPlaying || !autoScrollEnabled) return;

    const scrollInterval = setInterval(() => {
      scrollToHighlightedWord();
    }, 500);

    return () => clearInterval(scrollInterval);
  }, [audioProgress.isPlaying, autoScrollEnabled, scrollToHighlightedWord]);

  // Also scroll when section changes
  useEffect(() => {
    if (audioProgress.isPlaying && autoScrollEnabled && audioSection >= 0) {
      // Give DOM time to update, then scroll
      const timer = setTimeout(() => {
        scrollToHighlightedWord();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [audioSection, audioProgress.isPlaying, autoScrollEnabled, scrollToHighlightedWord]);

  // Disable auto-scroll temporarily if user manually scrolls the commentary container
  useEffect(() => {
    if (!audioProgress.isPlaying) return;

    const scrollContainer = commentaryScrollRef.current;
    if (!scrollContainer) return;

    let userScrollTimeout;
    let isAutoScrolling = false;

    const handleUserScroll = () => {
      // Ignore if this is a programmatic scroll
      if (isAutoScrolling) return;

      // Temporarily disable auto-scroll when user scrolls manually
      setAutoScrollEnabled(false);

      // Re-enable after 3 seconds of no manual scrolling
      clearTimeout(userScrollTimeout);
      userScrollTimeout = setTimeout(() => {
        setAutoScrollEnabled(true);
      }, 3000);
    };

    // Track scroll events only on the commentary container
    scrollContainer.addEventListener('wheel', handleUserScroll, { passive: true });
    scrollContainer.addEventListener('touchmove', handleUserScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('wheel', handleUserScroll);
      scrollContainer.removeEventListener('touchmove', handleUserScroll);
      clearTimeout(userScrollTimeout);
    };
  }, [audioProgress.isPlaying]);

  // Categories for header navigation
  const categories = [
    { id: 'home', name: 'Top Stories', icon: faBolt },
    { id: 'business', name: 'Business', icon: faChartLine },
    { id: 'technology', name: 'Tech', icon: faRobot },
    { id: 'finance', name: 'Markets', icon: faChartLine },
    { id: 'world', name: 'World', icon: faGlobeAmericas },
    { id: 'politics', name: 'Politics', icon: null },
  ];

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch related articles when article section changes
  useEffect(() => {
    if (article?.section) {
      const fetchRelatedArticles = async () => {
        try {
          console.log('📰 Fetching related articles for section:', article.section);
          const API_BASE_URL = process.env.REACT_APP_API_URL;
          const response = await fetch(`${API_BASE_URL}/api/articles?category=${article.section}&limit=5`);
          if (response.ok) {
            const data = await response.json();
            console.log('📰 Related articles data:', data);
            // Handle both possible response structures
            const articles = data.articles || data;
            // Filter out current article
            const related = (Array.isArray(articles) ? articles : []).filter(a => a.id !== article.id).slice(0, 4);
            console.log('📰 Filtered related articles:', related);
            setRelatedArticles(related);
          }
        } catch (error) {
          console.error('❌ Error fetching related articles:', error);
        }
      };
      fetchRelatedArticles();
    }
  }, [article?.section, article?.id]);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching article with ID:', id);

        // Check if this is a Wall Street Journal URL
        if (id.includes('wsj.com')) {
          console.log('Detected Wall Street Journal article');
          setIsWallStreetArticle(true);
          const data = await getWallStreetArticleByUrl(id);

          if (!data || data.isError) {
            throw new Error(data?.error || 'Could not retrieve Wall Street Journal article');
          }

          setArticle(data);

        } else {
          // Use regular article service for non-WSJ articles
          const data = await getArticleById(id);

          if (!data || data.isError) {
            throw new Error(data?.error || 'Could not retrieve article data');
          }

          console.log('📄 Article data received:', data);
          console.log('💬 Has AI commentary:', !!data.aiCommentary);
          console.log('📋 Commentary queued:', !!data._commentaryQueued);

          setArticle(data);

          // 🚀 If commentary is queued but not ready, poll for it
          if (data._commentaryQueued && !data.aiCommentary) {
            console.log('⏳ Commentary is generating, will poll for updates...');

            // Poll every 2 seconds for up to 30 seconds
            let pollCount = 0;
            const maxPolls = 15; // 30 seconds total

            const pollInterval = setInterval(async () => {
              pollCount++;

              try {
                const API_BASE_URL = process.env.REACT_APP_API_URL;
                const pollResponse = await fetch(`${API_BASE_URL}/api/articles/${encodeURIComponent(id)}?ai=true`);

                if (pollResponse.ok) {
                  const updatedData = await pollResponse.json();

                  if (updatedData.aiCommentary) {
                    console.log('✅ Commentary ready!');
                    setArticle(prev => ({
                      ...prev,
                      aiCommentary: updatedData.aiCommentary,
                      _commentaryQueued: false
                    }));
                    clearInterval(pollInterval);
                  } else if (pollCount >= maxPolls) {
                    console.log('⏱️ Polling timeout, commentary may still be generating');
                    clearInterval(pollInterval);
                  }
                }
              } catch (pollError) {
                console.error('Polling error:', pollError);
                if (pollCount >= maxPolls) {
                  clearInterval(pollInterval);
                }
              }
            }, 2000);

            // Store interval ID for cleanup
            return () => clearInterval(pollInterval);
          }
        }

        // Set document title to article title
        if (article?.title) {
          document.title = `${article.title} | USDaily24`;
        }

        // Commentary generation is now handled above during article fetch
        // Removed duplicate commentary call to prevent unnecessary API requests

        // Store this article in sessionStorage for quicker access later
        if (article && article.id) {
          try {
            const recentArticles = JSON.parse(sessionStorage.getItem('recentArticles') || '[]');
            // Only add if not already in the list
            if (!recentArticles.some(a => a && a.id === article.id)) {
              recentArticles.unshift(article);
              // Keep only the last 10 articles
              sessionStorage.setItem('recentArticles', JSON.stringify(recentArticles.slice(0, 10)));
            }
          } catch (storageErr) {
            console.error('Error storing article in session storage:', storageErr);
          }
        }
      } catch (err) {
        console.error('Failed to fetch article details:', err);
        setError(`Failed to load article. ${err.message || 'Please try again later.'}`);
        setArticle(null);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();

    // Reset title when component unmounts
    return () => {
      document.title = 'USDaily24';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Typewriter effect for AI commentary
  useEffect(() => {
    if (!article?.aiCommentary) {
      setDisplayedCommentary('');
      setIsTyping(false);
      return;
    }

    // If audio is playing or has been played, show full text immediately (disable karaoke writing)
    if (audioProgress.isPlaying || audioSection > -1) {
      setDisplayedCommentary(article.aiCommentary);
      setIsTyping(false);
      return;
    }

    const fullText = article.aiCommentary;
    setIsTyping(true);
    setDisplayedCommentary('');

    let currentIndex = 0;
    // Faster typing for better UX
    const typingSpeed = 10;
    let typingTimeout;

    const typeNextChar = () => {
      if (currentIndex < fullText.length) {
        setDisplayedCommentary(fullText.substring(0, currentIndex + 1));
        currentIndex++;
        typingTimeout = setTimeout(typeNextChar, typingSpeed);
      } else {
        setIsTyping(false);
      }
    };

    // Small delay before starting to type
    typingTimeout = setTimeout(typeNextChar, 300);

    return () => {
      clearTimeout(typingTimeout);
      setIsTyping(false);
    };
  }, [article?.aiCommentary, audioProgress.isPlaying, audioSection]);

  // Format the date to be more readable
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format full publication date with time
  const formatPubDate = (dateString) => {
    if (!dateString) return '';
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle bookmark
  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    // In a real app, you would save this to user preferences
  };

  // Handle share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.abstract,
        url: window.location.href,
      })
        .catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Could not copy link: ', err));
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><FontAwesomeIcon icon={faBolt} spin size="2x" className="text-blue-600" /></div>;
  if (error) return <div className="text-center py-20 px-4 text-red-600">{error}</div>;
  if (!article) return <div className="text-center py-20 px-4">Article not found</div>;

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-blue-100">

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 h-1 bg-blue-600 z-50" style={{ width: `${scrollProgress * 100}%` }} />

      {/* Compact Floating Indicator - only shows section info - Mobile optimized */}
      {audioProgress.isPlaying && (
        <div className="fixed bottom-16 sm:bottom-4 right-2 sm:right-4 z-50 animate-fadeIn">
          <div className="bg-gray-900/90 backdrop-blur text-white px-3 sm:px-4 py-2 rounded-full shadow-lg flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-0.5">
              <span className="w-0.5 h-2 bg-blue-400 rounded animate-pulse"></span>
              <span className="w-0.5 h-3 bg-blue-400 rounded animate-pulse delay-75"></span>
              <span className="w-0.5 h-2 bg-blue-400 rounded animate-pulse delay-150"></span>
            </div>
            <span className="whitespace-nowrap">
              {audioSection === 0 ? '🔑 Key Points' :
               audioSection === 1 ? '📊 Impact' :
               audioSection === 2 ? '🔮 Outlook' :
               '🎙️ Intro'}
            </span>
            {!autoScrollEnabled && (
              <button
                onClick={() => setAutoScrollEnabled(true)}
                className="text-xs text-blue-400 underline"
              >
                Resume
              </button>
            )}
          </div>
        </div>
      )}

      <Header />

      {/* Main Layout - Responsive */}
      <main className="w-full px-3 sm:px-4 py-3 sm:py-4">
        {/* Title Section - Full Width */}
        <div className="mb-3 sm:mb-4">
          <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
            <span className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs font-bold px-2 py-1 rounded uppercase">{article.section || 'News'}</span>
            <span className="text-gray-400 text-[10px] sm:text-xs py-1"><FontAwesomeIcon icon={faClock} /> {new Date(article.published_date || Date.now()).toLocaleDateString()}</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight font-serif">{article.title}</h1>
        </div>

        {/* 60/40 Split Layout: Image+Player | Text - Independent Scrolling */}
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-3 sm:gap-4 lg:gap-5">

          {/* LEFT SIDE (60%): Image + Audio Player - Sticky on ALL screens */}
          <div className="sticky top-0 z-10 self-start flex flex-col bg-white pb-2">
            {/* Large Image Container - Fixed size, image fits inside without cropping */}
            <div className="rounded-lg sm:rounded-xl overflow-hidden shadow-lg bg-gray-900 mb-2 flex-shrink-0 w-full h-44 sm:h-56 md:h-64 lg:h-80 xl:h-96 flex items-center justify-center">
              <img
                src={article.imageUrl || article.multimedia?.[0]?.url}
                alt={article.title}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Audio Player - Below Image */}
            {article.aiCommentary && (
              <div className="flex-shrink-0">
                <AudioPlayer
                  commentary={article.aiCommentary}
                  title={article.title}
                  onSectionChange={(idx) => setAudioSection(idx)}
                  onProgressUpdate={(progress) => setAudioProgress(progress)}
                />

                {/* Auto-scroll toggle - only visible when playing */}
                {audioProgress.isPlaying && (
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-full text-xs font-medium transition-all touch-manipulation ${
                        autoScrollEnabled
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${autoScrollEnabled ? 'bg-green-300 animate-pulse' : 'bg-gray-500'}`}></span>
                      Auto-scroll {autoScrollEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE (40%): Text/Commentary - Scrollable on all screens */}
          <article
            ref={commentaryScrollRef}
            className="min-w-0 overflow-y-auto max-h-[50vh] sm:max-h-[60vh] lg:max-h-[calc(100vh-160px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent mt-2 lg:mt-0"
          >

            {/* Forexyy AI Analysis Card - Teleprompter Style - Mobile Optimized */}
            {displayedCommentary || article.aiCommentary ? (
              <div
                ref={commentaryContainerRef}
                className={`bg-white border-2 rounded-lg sm:rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${
                  audioProgress.isPlaying ? 'border-blue-400' : 'border-blue-600'
                }`}
              >
                {/* Compact Header - Mobile Optimized */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-4 py-2.5 sm:py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-1.5 sm:gap-2">
                      <FontAwesomeIcon icon={faBolt} className="text-yellow-300 text-sm" />
                      <span className="hidden xs:inline">FOREXYY INSIGHT</span>
                      <span className="inline xs:hidden">INSIGHT</span>
                      {isTyping && <span className="text-[10px] sm:text-xs text-blue-200 animate-pulse ml-1 sm:ml-2">✍️</span>}
                    </h3>
                    <FontAwesomeIcon icon={faRobot} className="text-white/70 text-sm sm:text-base" />
                  </div>
                </div>

                {/* Content - Teleprompter Style with more line height - Mobile Optimized */}
                <div className="p-3 sm:p-4 md:p-5">
                  {(() => {
                    // Smart parser: Split commentary into 3 sections
                    const text = displayedCommentary;
                    const sections = [];

                    // Try to split by section headers first
                    const keyPointsMatch = text.match(/Key Points/i);
                    const impactMatch = text.match(/Impact Analysis/i);
                    const outlookMatch = text.match(/Future Outlook/i);

                    if (keyPointsMatch && impactMatch && outlookMatch) {
                      // Sections are clearly defined
                      const keyStart = keyPointsMatch.index;
                      const impactStart = impactMatch.index;
                      const outlookStart = outlookMatch.index;

                      sections.push({
                        title: 'Key Points',
                        icon: '🔑',
                        content: text.substring(keyStart + 'Key Points'.length, impactStart).trim()
                      });
                      sections.push({
                        title: 'Impact Analysis',
                        icon: '📊',
                        content: text.substring(impactStart + 'Impact Analysis'.length, outlookStart).trim()
                      });
                      sections.push({
                        title: 'Future Outlook',
                        icon: '🔮',
                        content: text.substring(outlookStart + 'Future Outlook'.length).trim()
                      });
                    } else {
                      // Fallback: Split into 3 paragraphs
                      const paragraphs = text.split('\n\n').filter(p => p.trim());
                      sections.push({
                        title: 'Key Points',
                        icon: '🔑',
                        content: paragraphs[0] || ''
                      });
                      sections.push({
                        title: 'Impact Analysis',
                        icon: '📊',
                        content: paragraphs[1] || ''
                      });
                      sections.push({
                        title: 'Future Outlook',
                        icon: '🔮',
                        content: paragraphs[2] || ''
                      });
                    }

                    return sections.map((section, idx) => {
                      const isActiveSection = audioSection === idx;
                      const isPastSection = audioSection > idx;

                      return (
                        <div
                          key={idx}
                          className={`mb-3 sm:mb-4 last:mb-0 transition-all duration-200 ${isActiveSection ? '' : ''}`}
                        >
                          {/* Compact Section Header - Mobile Optimized */}
                          <div className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg mb-1.5 sm:mb-2 transition-all duration-200 ${isActiveSection
                            ? 'bg-blue-600 shadow-md'
                            : isPastSection
                              ? 'bg-blue-100'
                              : 'bg-gray-100'
                            }`}>
                            <h4 className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 ${isActiveSection ? 'text-white' : 'text-blue-900'
                              }`}>
                              <span className="text-base sm:text-lg">{section.icon}</span>
                              <span>{section.title}</span>
                              {isActiveSection && (
                                <span className="ml-auto flex items-center gap-0.5">
                                  <span className="w-0.5 h-2 bg-white/80 rounded animate-pulse"></span>
                                  <span className="w-0.5 h-3 bg-white/80 rounded animate-pulse delay-75"></span>
                                  <span className="w-0.5 h-2 bg-white/80 rounded animate-pulse delay-150"></span>
                                </span>
                              )}
                            </h4>
                          </div>

                          {/* Section Content - Teleprompter Style - Mobile Optimized */}
                          <div className={`pl-2.5 sm:pl-4 pr-1.5 sm:pr-2 transition-all duration-200 ${
                            isActiveSection ? 'opacity-100' : isPastSection ? 'opacity-60' : 'opacity-40'
                          }`}>
                            <div className={`text-sm sm:text-base lg:text-lg leading-relaxed ${isActiveSection ? 'text-gray-900' : 'text-gray-600'}`}>
                              {(() => {
                                // Split content into sentences for highlighting
                                const sentences = section.content
                                  .split(/(?<=[.!?])\s+/)
                                  .filter(s => s.trim());

                                // Don't highlight if: not active, not playing, reading header, or no sentences
                                const shouldHighlight = isActiveSection &&
                                  audioProgress.isPlaying &&
                                  !audioProgress.isReadingHeader &&
                                  audioProgress.sectionIndex === idx &&
                                  sentences.length > 0;

                                if (!shouldHighlight) {
                                  // Show "Reading header" indicator when section is active but reading title
                                  if (isActiveSection && audioProgress.isPlaying && audioProgress.isReadingHeader && audioProgress.sectionIndex === idx) {
                                    return (
                                      <div>
                                        <span className="text-blue-500 text-xs sm:text-sm italic mb-1 block">🎙️ Reading title...</span>
                                        <span className="text-gray-400 text-sm sm:text-base lg:text-lg">{section.content}</span>
                                      </div>
                                    );
                                  }
                                  return <span className="text-gray-600 text-sm sm:text-base lg:text-lg">{section.content}</span>;
                                }

                                // Calculate which sentence is currently being read using WEIGHTED progress
                                const getSpeechWeight = (text) => {
                                  if (!text) return 0;
                                  let weight = 0;
                                  for (let i = 0; i < text.length; i++) {
                                    const char = text[i];
                                    if (/[A-Z]/.test(char)) weight += 1.3;
                                    else if (/[0-9]/.test(char)) weight += 1.1;
                                    else if ([',', ';', ':'].includes(char)) weight += 2.5;
                                    else if (['.', '!', '?'].includes(char)) weight += 5;
                                    else weight += 1;
                                  }
                                  return weight;
                                };

                                const totalWeight = sentences.reduce((sum, s) => sum + getSpeechWeight(s), 0);
                                // Add slight lead (5%) to keep highlighting ahead of audio
                                const progress = Math.min((audioProgress.contentProgress || 0) + 0.05, 1);
                                const targetWeight = progress * totalWeight;

                                let currentSentenceIndex = 0;
                                let accumulatedWeight = 0;
                                let weightInCurrentSentence = 0;

                                // Find current sentence
                                for (let i = 0; i < sentences.length; i++) {
                                  const sWeight = getSpeechWeight(sentences[i]);
                                  if (accumulatedWeight + sWeight > targetWeight) {
                                    currentSentenceIndex = i;
                                    weightInCurrentSentence = targetWeight - accumulatedWeight;
                                    break;
                                  }
                                  accumulatedWeight += sWeight;
                                  if (i === sentences.length - 1) {
                                    currentSentenceIndex = sentences.length - 1;
                                    weightInCurrentSentence = sWeight;
                                  }
                                }

                                return (
                                  <div className="space-y-1.5 sm:space-y-2">
                                    {sentences.map((sentence, sentenceIdx) => {
                                      const isCurrentSentence = sentenceIdx === currentSentenceIndex;
                                      const isPastSentence = sentenceIdx < currentSentenceIndex;

                                      if (isCurrentSentence) {
                                        // Split current sentence into words for word-level highlighting
                                        const words = sentence.split(/\s+/);

                                        // Calculate current word based on weight
                                        let currentWordIndex = 0;
                                        let accWordWeight = 0;

                                        if (weightInCurrentSentence <= 0) currentWordIndex = 0;

                                        for (let i = 0; i < words.length; i++) {
                                          const wWeight = getSpeechWeight(words[i]);
                                          if (accWordWeight + wWeight >= weightInCurrentSentence) {
                                            currentWordIndex = i;
                                            break;
                                          }
                                          accWordWeight += wWeight + 0.8; // space weight
                                          if (i === words.length - 1) currentWordIndex = words.length - 1;
                                        }

                                        return (
                                          <p key={sentenceIdx} className="text-gray-900 leading-relaxed text-sm sm:text-base lg:text-lg">
                                            {words.map((word, wordIdx) => {
                                              const isCurrentWord = wordIdx === currentWordIndex;
                                              const isPastWord = wordIdx < currentWordIndex;

                                              return (
                                                <span
                                                  key={`${idx}-${sentenceIdx}-${wordIdx}`}
                                                  ref={isCurrentWord ? highlightedWordRef : null}
                                                  data-highlighted={isCurrentWord ? 'true' : undefined}
                                                  className={`inline-block mr-1 sm:mr-1.5 rounded px-0.5 sm:px-1 py-0.5 ${
                                                    isCurrentWord
                                                      ? 'bg-yellow-400 text-gray-900 font-bold shadow-md ring-1 sm:ring-2 ring-yellow-500'
                                                      : isPastWord
                                                        ? 'text-gray-700'
                                                        : 'text-gray-400'
                                                  }`}
                                                >
                                                  {word}
                                                </span>
                                              );
                                            })}
                                          </p>
                                        );
                                      }

                                      return (
                                        <p
                                          key={sentenceIdx}
                                          className={`leading-relaxed text-sm sm:text-base lg:text-lg transition-colors duration-200 ${
                                            isPastSentence
                                              ? 'text-gray-800' // Already read
                                              : 'text-gray-400' // Coming up
                                          }`}
                                        >
                                          {sentence}
                                        </p>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              {isTyping && idx === 2 && (
                                <span className="inline-block w-0.5 h-5 bg-blue-600 ml-1 animate-pulse"></span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {/* Compact Footer */}
                  {!isTyping && !audioProgress.isPlaying && (
                    <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-gray-100">
                      <p className="text-[10px] sm:text-xs text-gray-400 text-center">
                        Forexyy Newsletter • AI-Enhanced Journalism
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-blue-200 mb-6 sm:mb-8">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="animate-spin">
                    <FontAwesomeIcon icon={faRobot} className="text-blue-600 text-xl sm:text-2xl" />
                  </div>
                  <div>
                    <p className="text-blue-900 font-semibold text-sm sm:text-base">Forexyy AI Analysis Generating...</p>
                    <p className="text-blue-600 text-xs sm:text-sm">Our team is analyzing this article for you</p>
                  </div>
                </div>
              </div>
            )}
          </article>

        </div>

        {/* Article Body - Full Width Below - Mobile Optimized */}
        <div className="mt-6 sm:mt-8 prose prose-sm sm:prose-base lg:prose-lg max-w-none text-gray-800 leading-relaxed font-serif">
          {article.content ? (
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          ) : (
            <p>{article.abstract || article.summary}</p>
          )}
        </div>

        {/* Action Bar - Mobile Optimized */}
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-2 sm:gap-4 border-t border-gray-100 pt-4 sm:pt-6">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full text-xs sm:text-sm font-medium transition touch-manipulation"
          >
            <FontAwesomeIcon icon={faShare} /> Share
          </button>
          <button
            onClick={handleBookmark}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 ${bookmarked ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'} hover:bg-gray-200 active:bg-gray-300 rounded-full text-xs sm:text-sm font-medium transition touch-manipulation`}
          >
            <FontAwesomeIcon icon={faBookmark} /> {bookmarked ? 'Saved' : 'Save'}
          </button>
          <div className="ml-auto flex gap-2">
            <button className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full active:bg-blue-100 touch-manipulation"><FontAwesomeIcon icon={faTwitter} /></button>
            <button className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full active:bg-blue-100 touch-manipulation"><FontAwesomeIcon icon={faFacebook} /></button>
          </div>
        </div>

        {/* RELATED ARTICLES - Mobile Optimized */}
        {relatedArticles.length > 0 && (
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 mb-3 sm:mb-4">
              <span className="w-1 h-4 sm:h-5 bg-blue-600 rounded-full"></span>
              Related Articles
            </h3>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-3 px-3 sm:mx-0 sm:px-0">
              {relatedArticles.map((relArticle, index) => (
                <Link
                  key={`related-${relArticle.id}-${index}`}
                  to={`/article/${encodeURIComponent(relArticle.url || relArticle.id)}`}
                  className="flex-none w-48 sm:w-56 md:w-64 group snap-start"
                >
                  <div className="bg-white rounded-lg overflow-hidden border border-gray-100 hover:border-blue-200 active:border-blue-300 hover:shadow-lg transition-all h-full touch-manipulation">
                    {relArticle.multimedia?.[0]?.url && (
                      <img src={relArticle.multimedia[0].url} alt={relArticle.title} className="w-full h-28 sm:h-32 md:h-36 object-cover" />
                    )}
                    <div className="p-2.5 sm:p-3">
                      <span className="text-[10px] sm:text-xs font-semibold text-blue-600 uppercase">{relArticle.section}</span>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-blue-600 line-clamp-2 mt-1">{relArticle.title}</h4>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Reels Slider - Hidden by default, slide up on click - Mobile Optimized */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${showReels ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Reels Tab - Always visible - Larger touch target on mobile */}
        <button
          onClick={() => setShowReels(!showReels)}
          className="absolute -top-11 sm:-top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-2 rounded-t-xl font-bold text-xs sm:text-sm shadow-lg flex items-center gap-1.5 sm:gap-2 touch-manipulation active:from-pink-600 active:to-purple-700"
        >
          <span>🎬</span>
          <span>Reels</span>
          <span className={`transition-transform duration-300 ${showReels ? 'rotate-180' : ''}`}>▲</span>
        </button>

        {/* Reels Content */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 sm:p-4 shadow-2xl max-h-[50vh] sm:max-h-none overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <ReelsSidebar horizontal={true} />
          </div>
        </div>
      </div>

      <FluidAd className="my-8" />
    </div>
  );
};

export default ArticlePage;
