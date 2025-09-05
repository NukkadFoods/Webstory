import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArticleById } from '../services/articleService';
import { getWallStreetArticleByUrl } from '../services/wallStreetService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faUser, faTag, faArrowLeft, faShare, faBookmark, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import RelatedArticles from '../components/RelatedArticles';
import FluidAd from '../components/FluidAd';

const ArticlePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [isWallStreetArticle, setIsWallStreetArticle] = useState(false);

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
          
          setArticle(data);

          // Generate AI commentary for the article
          try {
            const API_BASE_URL = process.env.REACT_APP_API_URL;
            const response = await fetch(`${API_BASE_URL}/api/generate-commentary`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: data.title,
                content: data.abstract || data.summary || data.content || 'No content available',
                category: data.section || data.category
              }),
            });
            
            if (response.ok) {
              const commentaryData = await response.json();
              // Update article with commentary and reporter info
              setArticle(prev => ({
                ...prev,
                aiCommentary: commentaryData.commentary,
                reporter: commentaryData.reporter
              }));
            }
          } catch (commentaryError) {
            console.error('Error generating commentary:', commentaryError);
          }
        }
        
        // Set document title to article title
        if (article?.title) {
          document.title = `${article.title} | USDaily24`;
        }
        
        // Generate commentary only if we have a valid article
        if (article && article.title) {
          try {
            const API_BASE_URL = process.env.REACT_APP_API_URL;
            const response = await fetch(`${API_BASE_URL}/api/generate-commentary`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: article.title,
                content: article.abstract || article.summary || article.content || 'No content available',
                category: article.section || article.category || 'general'
              }),
            });
            
            if (response.ok) {
              const commentaryData = await response.json();
              // Update article with commentary
              setArticle(prev => ({
                ...prev,
                aiCommentary: commentaryData.commentary
              }));
            } else {
              console.log('Commentary generation failed with status:', response.status);
            }
          } catch (commentaryError) {
            console.error('Error generating commentary:', commentaryError);
          }
        }
        
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

  if (loading) {
    return (
      <div className="flex justify-center items-center my-12 min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        <span className="ml-3 text-blue-700">Loading article...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-red-50 border border-red-300 rounded-lg">
        <div className="flex items-center mb-4 text-red-700">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-xl" />
          <h2 className="text-2xl font-bold">Error Loading Article</h2>
        </div>
        <p className="mb-6 text-red-700">{error}</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Go back
          </button>
          <button onClick={() => window.location.reload()} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Article not found</h2>
        <p className="text-gray-600 mb-6">The article you're looking for might have been removed or is temporarily unavailable.</p>
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-700">
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Go back
        </button>
      </div>
    );
  }

  return (
    <div className="article-page max-w-4xl mx-auto px-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-700 mb-6">
        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Go back
      </button>
      
      {/* Article Header */}
      <header className="mb-8">
        
        <h1 className="text-4xl font-bold mb-4">{article?.title}</h1>
        <div className="flex flex-wrap items-center text-gray-600 gap-4 mb-4">
          {article?.published_date && (
            <span className="flex items-center">
              <FontAwesomeIcon icon={faClock} className="mr-2" />
              {formatDate(article.published_date)}
            </span>
          )}
          {article?.byline && (
            <span className="flex items-center">
              <FontAwesomeIcon icon={faUser} className="mr-2" />
              {article.byline.replace(/^By\s+/i, '').replace(/Associated Press|AP/gi, 'USDaily24')}
            </span>
          )}
          {article?.section && (
            <span className="flex items-center">
              <FontAwesomeIcon icon={faTag} className="mr-2" />
              {article.section}
            </span>
          )}
          {isWallStreetArticle && (
            <span className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              Wall Street Journal
            </span>
          )}
        </div>
        <p className="text-xl text-gray-600 font-light">{article?.abstract}</p>
        
                  {/* Article Actions */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button 
            onClick={handleBookmark}
            className={`flex items-center py-1 px-3 rounded-full text-sm ${
              bookmarked 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FontAwesomeIcon icon={faBookmark} className="mr-2" />
            {bookmarked ? 'Saved' : 'Save'}
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center py-1 px-3 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <FontAwesomeIcon icon={faShare} className="mr-2" />
            Share
          </button>
        </div>
      </header>

      {/* Featured Image */}
      {article.multimedia && article.multimedia.length > 0 && (
        <div className="mb-8">
          <img
            src={article.multimedia[0].url}
            alt={article.title}
            className="w-full h-auto rounded-lg shadow-md"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          {article.multimedia[0].caption && !article.multimedia[0].caption.includes('credit') && (
            <p className="text-sm text-gray-500 mt-2">{article.multimedia[0].caption}</p>
          )}
        </div>
      )}

      {/* Horizontal Ad after header */}
      <FluidAd className="my-6" />

      {/* Main Article Content */}
      <div className="prose prose-lg max-w-none mb-8">
        <div className="article-content text-gray-800 leading-relaxed">
          {article.content ? (
            typeof article.content === 'string' && article.content.includes('<') ? (
              <div dangerouslySetInnerHTML={{ __html: article.content }} />
            ) : (
              <div className="whitespace-pre-wrap">{article.content}</div>
            )
          ) : article.summary ? (
            <div>
              <p className="text-lg leading-relaxed mb-4">{article.summary}</p>
              {article.url && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
                  <p className="text-blue-800 mb-2">
                    <strong>This is a preview.</strong> Read the full article at the source:
                  </p>
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Read Full Article
                    <svg className="ml-2 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-yellow-800">
                Article content is not available. Please check back later or visit the source website.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Commentary Section */}
      {article.aiCommentary && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-lg border border-blue-200">
            {/* Reporter Header - Enhanced */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border-l-4 border-blue-500">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {article.reporter ? article.reporter.name.split(' ').map(n => n[0]).join('') : 'FN'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      FOREXYY INSIGHT
                    </span>
                    <span className="text-xs text-gray-500">ANALYSIS</span>
                  </div>
                  {article.reporter ? (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{article.reporter.name}</h3>
                      <p className="text-sm font-medium text-blue-700">{article.reporter.title}</p>
                      <p className="text-xs text-gray-600">{article.reporter.location}</p>
                      {article.reporter.expertise && (
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Specializes in:</span> {article.reporter.expertise}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Forexyy News Team</h3>
                      <p className="text-sm font-medium text-blue-700">Editorial Analysis</p>
                      <p className="text-xs text-gray-600">Forexyy Newsletter, National</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Commentary Content */}
            <div className="space-y-4">
              {article.aiCommentary.split('\n\n').map((paragraph, index) => {
                // For the first paragraph - Key Points
                if (index === 0) {
                  return (
                    <div key={index} className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-emerald-400">
                      <div className="flex items-center mb-3">
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs font-bold">1</span>
                        </div>
                        <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Key Points</h3>
                      </div>
                      <p className="text-gray-800 leading-relaxed">{paragraph}</p>
                    </div>
                  );
                }
                // For the second paragraph - Impact Analysis
                else if (index === 1) {
                  return (
                    <div key={index} className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-amber-400">
                      <div className="flex items-center mb-3">
                        <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs font-bold">2</span>
                        </div>
                        <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wide">Impact Analysis</h3>
                      </div>
                      <p className="text-gray-800 leading-relaxed">{paragraph}</p>
                    </div>
                  );
                }
                // For the third paragraph - Future Outlook
                else {
                  return (
                    <div key={index} className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-purple-400">
                      <div className="flex items-center mb-3">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                          <span className="text-white text-xs font-bold">3</span>
                        </div>
                        <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wide">Future Outlook</h3>
                      </div>
                      <p className="text-gray-800 leading-relaxed">{paragraph}</p>
                    </div>
                  );
                }
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-blue-200">
              <p className="text-xs text-gray-500 text-center">
                <span className="font-semibold text-blue-600">Forexyy Newsletter</span> • Expert Analysis & Insights • 
                <span className="ml-1">Powered by AI-Enhanced Journalism</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* In-feed Ad after AI Commentary */}
      <FluidAd className="my-6" />

      {/* Publication Info */}
      <div className="text-sm text-gray-500 mt-4">
        <p>Published: {formatPubDate(article.published_date)}</p>
      </div>

      {/* Related Articles */}
      <RelatedArticles section={article.section} />
    </div>
  );
};

export default ArticlePage;