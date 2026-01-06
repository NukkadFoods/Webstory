import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTopStories } from '../services/storyService';
import { getWallStreetArticles } from '../services/wallStreetService';
import { getEntertainmentArticles } from '../services/entertainmentService';
import { getFinanceArticles } from '../services/financeService';
import NewsCard from '../components/NewsCard';
import NewsGrid from '../components/NewsGrid';
import ReelsSidebar from '../components/ReelsSidebar';
import FluidAd from '../components/FluidAd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faChevronRight, faRobot } from '@fortawesome/free-solid-svg-icons';

const CategoryPage = () => {
  const { category } = useParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    <div className="category-page w-full pl-4 pr-0 py-8">
      <div className="grid grid-cols-[1fr_auto] gap-6">
        {/* Main Content - takes remaining space */}
        <div className="min-w-0">
      
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
        <Link to="/" className="mt-2 sm:mt-0 inline-flex items-center text-blue-600 hover:text-blue-700">
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

      {/* Hero Article Section */}
      {!loading && !error && heroArticle && (
        <section className="mb-12 animate-fade-in-up">
          <div className="group relative">
            <Link to={getArticleLink(heroArticle)} className="block h-full relative overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500">
              
              {/* Image Container */}
              <div className="aspect-w-16 aspect-h-10 lg:h-[500px] w-full overflow-hidden bg-gray-200">
                <img 
                  src={getImage(heroArticle)} 
                  alt={heroArticle.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              </div>

              {/* Text Overlay */}
              <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full z-10">
                
                {/* Tags Row */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-blue-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                    {heroArticle.section || displayName}
                  </span>
                  {heroArticle.commentary && (
                    <span className="backdrop-blur-md bg-white/20 border border-white/30 text-white text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                      <FontAwesomeIcon icon={faRobot} className="text-indigo-300" /> 
                      <span>AI Analysis Ready</span>
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 font-serif text-shadow-sm">
                  {heroArticle.title}
                </h1>
                
                <p className="hidden md:block text-gray-200 text-lg line-clamp-2 max-w-3xl mb-6 leading-relaxed">
                  {heroArticle.abstract || heroArticle.summary}
                </p>

                <div className="flex items-center text-gray-300 text-sm font-medium">
                  <span className="uppercase tracking-widest text-xs">{heroArticle.byline || 'Forexyy Team'}</span>
                  <span className="mx-2">•</span> 
                  <span className="text-blue-300 group-hover:text-blue-200 transition-colors flex items-center gap-1">
                    Read Full Story <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Main Feed Grid */}
      {!loading && !error && feedArticles.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-6 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Latest in {displayName}</h2>
              <p className="text-gray-500 mt-1">Stay updated with the latest stories</p>
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
          <h2 className="text-2xl font-bold mb-4">No articles found</h2>
          <p className="text-gray-600">No articles are currently available for this category.</p>
        </div>
      )}
        </div>

        {/* Reels Sidebar - 4 columns */}
        <ReelsSidebar />
      </div>
    </div>
  );
};

export default CategoryPage;