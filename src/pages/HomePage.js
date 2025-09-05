import React, { useState, useEffect } from 'react';
import { getTopStories } from '../services/storyService';
import HeroSection from '../components/HeroSection';
import NewsGrid from '../components/NewsGrid';
import FluidAd from '../components/FluidAd';
import TrendingTopics from '../components/TrendingTopics';
import useLoadMore from '../hooks/useLoadMore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faSpinner, faArrowDown, faFilter } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('home');
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Use custom hook for load more functionality
  const { visibleArticles, hasMore, loading: loadMoreLoading, loadMore } = useLoadMore(filteredArticles, 4);
  const [availableCategories, setAvailableCategories] = useState([]);
  
  const categories = [
    { id: 'home', name: 'Top Stories' },
    { id: 'politics', name: 'Politics' },
    { id: 'business', name: 'Business' },
    { id: 'technology', name: 'Technology' },
    { id: 'science', name: 'Science' },
    { id: 'health', name: 'Health' },
    { id: 'finance', name: 'Finance' },
    { id: 'arts', name: 'Arts' },
    { id: 'sports', name: 'Sports' },
    { id: 'world', name: 'World News' },
    { id: 'us', name: 'U.S. News' },
    { id: 'realestate', name: 'Real Estate' },
    { id: 'travel', name: 'Travel' },
    { id: 'opinion', name: 'Opinion' },
    { id: 'automobiles', name: 'Autos' },
    { id: 'fashion', name: 'Fashion' },
    { id: 'food', name: 'Food' }
  ];

  // Fetch articles and determine available categories
  useEffect(() => {
    const fetchArticles = async () => {
      if (isSearchMode) return;
      
      setLoading(true);
      setError(null); // Clear previous errors
      
      try {
        console.log('HomePage: Fetching articles for category:', activeCategory);
        const data = await getTopStories(activeCategory);
        console.log('HomePage: Received articles:', data?.length || 0);
        
        if (!data || data.length === 0) {
          setFilteredArticles([]);
          setError('No articles found. Please try again later.');
          return;
        }
        
        // Extract all available categories from the articles
        const availableCats = new Set();
        data.forEach(article => {
          if (article.section) {
            availableCats.add(article.section.toLowerCase());
          }
        });
        
        setAvailableCategories(Array.from(availableCats));
        
        // Filter articles by active category if not home
        if (activeCategory !== 'home') {
          const filtered = data.filter(article => 
            article.section && article.section.toLowerCase() === activeCategory.toLowerCase()
          );
          
          // If not enough articles for this category, try to fetch more specific ones
          if (filtered.length < 5) {
            try {
              const categorySpecificData = await getTopStories(activeCategory);
              const combinedData = [...filtered];
              
              // Add unique articles from category-specific fetch
              categorySpecificData.forEach(newArticle => {
                if (!filtered.some(article => article.uri === newArticle.uri)) {
                  combinedData.push(newArticle);
                }
              });
              
              setFilteredArticles(combinedData);
            } catch (err) {
              console.error(`Failed to fetch additional ${activeCategory} articles:`, err);
              setFilteredArticles(filtered);
            }
          } else {
            setFilteredArticles(filtered);
          }
        } else {
          setFilteredArticles(data);
        }
        
        // Store the articles in session storage for easy access in article page
        sessionStorage.setItem('topStories', JSON.stringify(data));
        setError(null);
      } catch (err) {
        console.error('Failed to fetch articles:', err);
        setError('Failed to load articles. Please try again later.');
        setFilteredArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [activeCategory, isSearchMode]);

  // Reset to initial state when changing categories
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setIsSearchMode(false);
  };

  // For demo purposes, if we don't have any articles (due to API key issues or rate limiting),
  // we'll show some placeholder data
  const hasArticles = filteredArticles && filteredArticles.length > 0;

  // Get the correct article identifier for the featured article
  const getFeaturedArticleLink = (article) => {
    if (!article) return '/';
    
    // Use the same logic as NewsCard for consistency
    if (article.id && typeof article.id === 'string') {
      return `/article/${encodeURIComponent(article.id)}`;
    }
    
    if (article.uri && typeof article.uri === 'string') {
      return `/article/${encodeURIComponent(article.uri.split('/').pop())}`;
    }
    
    if (article.url && typeof article.url === 'string') {
      return `/article/${encodeURIComponent(article.url)}`;
    }
    
    return `/article/${encodeURIComponent(article.title || 'unknown')}`;
  };

  // Filter out categories that don't have any articles
  const availableCategoryButtons = categories.filter(category => 
    category.id === 'home' || availableCategories.includes(category.id)
  );

  // Determine which articles to display
  const displayLoading = loading;
  const displayError = error;
  
  // Get featured article and rest of articles based on filtering
  const featuredArticle = hasArticles ? filteredArticles[0] : null;

  return (
    <div className="homepage">
      {/* Hero Section at the top */}
      <HeroSection />
      
      <div className="container mx-auto px-4 py-8">
        {/* Trending Topics Bar */}
        <TrendingTopics />
        
        {/* Main Content Area */}
        <div>
          {/* Article Section - Now taking full width */}
          <div className="w-full">
            <section className="mb-8">
              <div className="flex flex-wrap items-center justify-between mb-2">
                <h1 className="text-3xl font-bold">Latest News</h1>
                
                {activeCategory !== 'home' && (
                  <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    <FontAwesomeIcon icon={faFilter} className="mr-2" />
                    <span className="text-sm font-medium">Filtered by {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}</span>
                  </div>
                )}
              </div>
              
              <p className="text-gray-600 mb-6">Stay informed with the most important stories from across the United States</p>
              
              {/* Category Navigation - Only showing categories with content */}
              <div className="category-navigation mb-6 flex flex-wrap gap-2">
                {availableCategoryButtons.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`category-btn px-4 py-2 rounded-md transition-all ${
                      activeCategory === category.id 
                        ? 'active bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Top Banner Ad - Prominent placement */}
              <FluidAd className="mb-8" />

              {/* Loading Indicator */}
              {displayLoading && (
                <div className="flex justify-center my-12">
                  <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-blue-600" />
                </div>
              )}

              {/* Error Message */}
              {displayError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {displayError}
                </div>
              )}

              {/* No Results Message */}
              {!displayLoading && !displayError && (!hasArticles || filteredArticles.length === 0) && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
                  No articles found for {activeCategory}. Please try another category.
                </div>
              )}

              {/* Featured Article */}
              {!loading && !error && featuredArticle && (
                <div className="featured-article mb-8">
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="md:flex">
                      {(featuredArticle.imageUrl || (featuredArticle.multimedia && featuredArticle.multimedia.length > 0)) && (
                        <div className="md:w-1/2">
                          <Link to={getFeaturedArticleLink(featuredArticle)}>
                            <img 
                              src={featuredArticle.imageUrl || featuredArticle.multimedia[0].url} 
                              alt={featuredArticle.title}
                              className="w-full h-64 md:h-full object-cover hover:opacity-90 transition-opacity"
                              onError={(e) => {
                                console.log('Featured article image failed to load:', e.target.src);
                                e.target.style.display = 'none';
                              }}
                            />
                          </Link>
                        </div>
                      )}
                      <div className="p-6 md:w-1/2">
                        <span className="text-sm font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                          {featuredArticle.section}
                        </span>
                        <h2 className="text-2xl font-bold my-3">
                          <Link 
                            to={getFeaturedArticleLink(featuredArticle)} 
                            className="hover:text-blue-700 transition-colors"
                          >
                            {featuredArticle.title}
                          </Link>
                        </h2>
                        <p className="text-gray-600 mb-4">{featuredArticle.abstract || featuredArticle.summary}</p>
                        <p className="text-sm text-gray-500 mb-4">{featuredArticle.byline}</p>
                        <Link 
                          to={getFeaturedArticleLink(featuredArticle)} 
                          className="inline-flex items-center text-blue-700 font-medium hover:underline"
                        >
                          Read full story <FontAwesomeIcon icon={faChevronRight} className="ml-1 text-xs" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fluid Ad after featured article - Your dedicated ad space */}
              <FluidAd className="mb-8" />

              {/* Article Grid - Now showing articles with AI commentary */}
              <NewsGrid 
                articles={visibleArticles} 
                loading={displayLoading} 
                error={displayError}
              />

              {/* Another Fluid Ad after first set of articles */}
              {!loading && !error && hasArticles && visibleArticles.length >= 4 && (
                <FluidAd className="my-8" />
              )}
              
              {/* Load More Button */}
              {!loading && !error && hasArticles && hasMore && (
                <div className="flex justify-center mt-10">
                  <button 
                    onClick={loadMore}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={loadMoreLoading}
                  >
                    {loadMoreLoading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faArrowDown} className="mr-2" />
                        Load More Articles
                      </>
                    )}
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;