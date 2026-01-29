import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTopStories } from '../services/storyService';
import { getWallStreetArticles } from '../services/wallStreetService';
import { getEntertainmentArticles } from '../services/entertainmentService';
import { getFinanceArticles } from '../services/financeService';
import NewsCard from '../components/NewsCard';
import NewsGrid from '../components/NewsGrid';
import ReelsSidebar from '../components/ReelsSidebar';
import Header from '../components/Header';
import FluidAd from '../components/FluidAd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faChevronRight, faRobot } from '@fortawesome/free-solid-svg-icons';

const CategoryPage = () => {
  const { category } = useParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReels, setShowReels] = useState(false);

  // Define a mapping of URL categories to display names
  const categoryNames = {
    'politics': 'Politics',
    'business': 'Business',
    'technology': 'Technology',
    'health': 'Health',
    'science': 'Science',
    'sports': 'Sports',
    'finance': 'Finance',
    'entertainment': 'Entertainment',
    'wallstreet': 'Wall Street',
    'world': 'World News',
    'us': 'U.S. News',
    'realestate': 'Real Estate',
    'travel': 'Travel',
    'opinion': 'Opinion',
    'automobiles': 'Automobiles',
    'fashion': 'Fashion',
    'food': 'Food',
    'arts': 'Arts'
  };

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        console.log(`Fetching articles for category: ${category}`);
        
        let data;
        
        // Use different services based on the category
        if (category === 'wallstreet') {
          const response = await getWallStreetArticles();
          data = response.articles;
        } else if (category === 'entertainment') {
          const response = await getEntertainmentArticles();
          data = response.articles;
        } else if (category === 'finance') {
          const response = await getFinanceArticles();
          data = response.articles;
        } else {
          data = await getTopStories(category);
        }
        
        // Ensure all articles have the required properties and protect against null values
        const sanitizedArticles = data.map(article => ({
          ...article,
          multimedia: article.multimedia || [],
          section: article.section || category,
          abstract: article.abstract || 'No description available',
          byline: article.byline || '',
        }));
        
        setArticles(sanitizedArticles);
        setError(null);
        
        // Store in session for article details page
        sessionStorage.setItem(`category_${category}`, JSON.stringify(sanitizedArticles));
      } catch (err) {
        console.error('Failed to fetch category articles:', err);
        setError('Failed to load articles. Please try again later.');
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [category]);

  const displayName = categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);

  // Helper functions
  const getArticleLink = (article) => {
    const id = article.uuid || article.id || article.url;
    if (!id) return '#';
    return `/article/${encodeURIComponent(id)}`;
  };

  const getImage = (article) => {
    if (article.imageUrl) return article.imageUrl;
    if (article.multimedia && article.multimedia.length > 0) {
      return article.multimedia[0].url;
    }
    return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';
  };

  // Split articles into hero and feed
  const heroArticle = articles[0];
  const feedArticles = articles.slice(1);

  return (
    <div className="category-page min-h-screen bg-gray-50">
      <Header />

      <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 pb-20">
        {/* Main Content - Full Width */}
        <div className="w-full">

          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{displayName}</h1>
            <Link to="/" className="mt-2 sm:mt-0 inline-flex items-center text-blue-600 hover:text-blue-700 text-sm sm:text-base">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Back to home
            </Link>
          </div>

      {loading && (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-blue-600/50" />
          <p className="text-gray-400 font-medium animate-pulse">Loading {displayName}...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}

          {/* Hero Article Section - Clean Design */}
          {!loading && !error && heroArticle && (
            <section className="mb-6 sm:mb-8">
              <Link to={getArticleLink(heroArticle)} className="group block relative overflow-hidden rounded-xl sm:rounded-2xl shadow-md hover:shadow-xl transition-all duration-500 touch-manipulation">
                {/* Image Container */}
                <div className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] w-full overflow-hidden bg-gray-200">
                  <img
                    src={getImage(heroArticle)}
                    alt={heroArticle.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                </div>

                {/* Text Overlay - Simplified */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 lg:p-10">
                  <span className="inline-block bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 sm:mb-3">
                    {heroArticle.section || displayName}
                  </span>

                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight font-serif group-hover:text-blue-200 transition-colors">
                    {heroArticle.title}
                  </h1>
                </div>
              </Link>
            </section>
          )}

          {/* Main Feed Grid */}
          {!loading && !error && feedArticles.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-4 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Latest in {displayName}</h2>
                  <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1 hidden sm:block">Stay updated with the latest stories</p>
                </div>
              </div>

              <NewsGrid
                articles={feedArticles}
                loading={false}
                error={null}
              />
            </section>
          )}

          {/* Empty State */}
          {!loading && !error && articles.length === 0 && (
            <div className="text-center py-12">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">No articles found</h2>
              <p className="text-gray-600 text-sm sm:text-base">No articles are currently available for this category.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Reels Slider - Hidden by default, slide up on click */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${showReels ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Reels Tab - Always visible */}
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
    </div>
  );
};

export default CategoryPage;