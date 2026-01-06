import React, { useState, useEffect } from 'react';
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
import logo from '../logo/1756335129.png';

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

    const fullText = article.aiCommentary;
    setIsTyping(true);
    setDisplayedCommentary('');
    
    let currentIndex = 0;
    const typingSpeed = 15; // milliseconds per character (adjust for speed)

    const typeNextChar = () => {
      if (currentIndex < fullText.length) {
        setDisplayedCommentary(fullText.substring(0, currentIndex + 1));
        currentIndex++;
        setTimeout(typeNextChar, typingSpeed);
      } else {
        setIsTyping(false);
      }
    };

    // Small delay before starting to type
    const startDelay = setTimeout(typeNextChar, 300);

    return () => {
      clearTimeout(startDelay);
      setIsTyping(false);
    };
  }, [article?.aiCommentary]);

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

  if (loading) return <div className="h-screen flex items-center justify-center"><FontAwesomeIcon icon={faBolt} spin size="2x" className="text-blue-600"/></div>;
  if (error) return <div className="text-center py-20 text-red-600">{error}</div>;
  if (!article) return <div className="text-center py-20">Article not found</div>;

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-blue-100">
      
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 h-1 bg-blue-600 z-50" style={{ width: `${scrollProgress * 100}%` }} />

      <Header />

      {/* Main 2-Column Layout */}
      <main className="w-full pl-4 pr-0 py-8">
        <div className="grid grid-cols-[1fr_auto] gap-6">
          
          {/* MAIN CONTENT - takes remaining space */}
          <article className="min-w-0">
            
            <header className="mb-8">
              <div className="flex gap-2 mb-4">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded uppercase">{article.section || 'News'}</span>
                <span className="text-gray-400 text-xs py-1"><FontAwesomeIcon icon={faClock} /> {new Date(article.published_date || Date.now()).toLocaleDateString()}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-6 font-serif">{article.title}</h1>
              
              {/* Main Image */}
              <div className="rounded-xl overflow-hidden shadow-sm mb-8 bg-gray-100">
                <img 
                  src={article.imageUrl || article.multimedia?.[0]?.url} 
                  alt={article.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            </header>

            {/* Forexyy AI Analysis Card */}
            {displayedCommentary || article.aiCommentary ? (
              <div className="bg-white border-2 border-blue-600 rounded-2xl overflow-hidden mb-8 shadow-lg">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-xl flex items-center gap-2 mb-1">
                        <FontAwesomeIcon icon={faBolt} className="text-yellow-300" /> 
                        FOREXYY INSIGHT
                      </h3>
                      <p className="text-blue-100 text-xs uppercase tracking-wide">
                        Analysis by Forexyy News Team {isTyping && <span className="animate-pulse">✍️ Writing...</span>}
                      </p>
                    </div>
                    <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                      <FontAwesomeIcon icon={faRobot} className={isTyping ? "text-white animate-pulse" : "text-white"} />
                    </div>
                  </div>
                </div>
                
                {/* Content with Typewriter Effect */}
                <div className="p-6">
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
                    
                    return sections.map((section, idx) => (
                      <div key={idx} className="mb-6 last:mb-0 animate-fadeIn">
                        {/* Section Header - Bold & Highlighted */}
                        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-lg mb-4">
                          <h4 className="text-xl font-bold text-blue-900 flex items-center gap-3">
                            <span className="text-3xl">{section.icon}</span>
                            <span>{section.title}</span>
                          </h4>
                        </div>
                        
                        {/* Section Content */}
                        <div className="pl-8 pr-4">
                          <p className="text-gray-700 leading-relaxed text-base">
                            {section.content}
                            {isTyping && idx === 2 && (
                              <span className="inline-block w-0.5 h-5 bg-blue-600 ml-1 animate-pulse"></span>
                            )}
                          </p>
                        </div>
                      </div>
                    ));
                  })()}
                  
                  {/* Footer */}
                  {!isTyping && (
                    <div className="mt-6 pt-4 border-t border-gray-200 animate-fadeIn">
                      <p className="text-xs text-gray-500 text-center">
                        Forexyy Newsletter • Expert Analysis & Insights • Powered by AI-Enhanced Journalism
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 mb-8">
                <div className="flex items-center gap-3">
                  <div className="animate-spin">
                    <FontAwesomeIcon icon={faRobot} className="text-blue-600 text-2xl" />
                  </div>
                  <div>
                    <p className="text-blue-900 font-semibold">Forexyy AI Analysis Generating...</p>
                    <p className="text-blue-600 text-sm">Our team is analyzing this article for you</p>
                  </div>
                </div>
              </div>
            )}

            {/* Article Body */}
            <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed font-serif">
               {article.content ? (
                 <div dangerouslySetInnerHTML={{ __html: article.content }} />
               ) : (
                 <p>{article.abstract || article.summary}</p>
               )}
            </div>

            {/* Action Bar */}
            <div className="mt-12 flex items-center gap-4 border-t border-gray-100 pt-6">
               <button 
                 onClick={handleShare}
                 className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition"
               >
                 <FontAwesomeIcon icon={faShare} /> Share
               </button>
               <button 
                 onClick={handleBookmark}
                 className={`flex items-center gap-2 px-4 py-2 ${bookmarked ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'} hover:bg-gray-200 rounded-full text-sm font-medium transition`}
               >
                 <FontAwesomeIcon icon={faBookmark} /> {bookmarked ? 'Saved' : 'Save'}
               </button>
               <div className="ml-auto flex gap-2">
                 <button className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full"><FontAwesomeIcon icon={faTwitter}/></button>
                 <button className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full"><FontAwesomeIcon icon={faFacebook}/></button>
               </div>
            </div>
          </article>


          {/* RIGHT COLUMN: REELS / SHORTS (4 cols) */}
          <ReelsSidebar />

        </div>

        {/* RELATED ARTICLES - Horizontal Scroll at Bottom */}
        {relatedArticles.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                Related Articles
              </h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
              {relatedArticles.map((relArticle, index) => (
                <Link 
                  key={`related-${relArticle.id}-${index}`}
                  to={`/article/${relArticle.id}`}
                  className="flex-none w-72 group snap-start"
                >
                  <div className="bg-white rounded-lg overflow-hidden border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all h-full">
                    {relArticle.multimedia?.[0]?.url && (
                      <img 
                        src={relArticle.multimedia[0].url} 
                        alt={relArticle.title}
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <span className="text-xs font-semibold text-blue-600 uppercase">
                        {relArticle.section}
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 line-clamp-2 mt-2 mb-2">
                        {relArticle.title}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {new Date(relArticle.published_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <FluidAd className="my-12" />
    </div>
  );
};

export default ArticlePage;
