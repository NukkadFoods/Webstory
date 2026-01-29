import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTopStories } from '../services/storyService';
import useLoadMore from '../hooks/useLoadMore';
import NewsGrid from '../components/NewsGrid';
import FluidAd from '../components/FluidAd';
import Header from '../components/Header';
import ReelsSidebar from '../components/ReelsSidebar';
import NewsletterPopup from '../components/NewsletterPopup';

// Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronRight,
  faSpinner,
  faArrowDown,
  faRobot,
  faBolt,
  faSearch,
  faChartLine,
  faGlobeAmericas
} from '@fortawesome/free-solid-svg-icons';

const HomePage = () => {
  // --- State Management ---
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('home');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showReels, setShowReels] = useState(false);

  // --- Load More Hook (Start with 9 items to fill grid nicely) ---
  const { visibleArticles, hasMore, loading: loadMoreLoading, loadMore } = useLoadMore(filteredArticles, 9);

  // --- Configuration ---
  const categories = [
    { id: 'home', name: 'Top Stories', icon: faBolt },
    { id: 'politics', name: 'Politics', icon: null },
    { id: 'business', name: 'Business', icon: faChartLine },
    { id: 'technology', name: 'Tech', icon: faRobot },
    { id: 'world', name: 'World', icon: faGlobeAmericas },
    { id: 'entertainment', name: 'Pop Culture', icon: null },
    { id: 'health', name: 'Health', icon: null },
    { id: 'sports', name: 'Sports', icon: null },
  ];

  // --- Data Fetching ---
  useEffect(() => {
    const fetchArticles = async () => {
      if (isSearchMode) return;

      setLoading(true);
      setError(null);

      try {
        const data = await getTopStories(activeCategory);

        if (!data || data.length === 0) {
          setFilteredArticles([]);
          return;
        }

        // Save to state & session
        setFilteredArticles(data);
        sessionStorage.setItem('topStories', JSON.stringify(data));

      } catch (err) {
        console.error('Fetch error:', err);
        setError('Unable to load the latest stories.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [activeCategory, isSearchMode]);

  // --- Helpers ---
  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    setIsSearchMode(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Robust link generator
  const getArticleLink = (article) => {
    const id = article.uuid || article.id || article.url;
    // Fallback if ID is missing
    if (!id) return '#';
    return `/article/${encodeURIComponent(id)}`;
  };

  // Safe Image Getter
  const getImage = (article) => {
    if (article.imageUrl) return article.imageUrl;
    if (article.multimedia && article.multimedia.length > 0) {
      // Return the largest image usually at index 0 or look for 'superJumbo'
      return article.multimedia[0].url;
    }
    // Placeholder if no image found
    return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';
  };

  // --- Layout Data ---
  // The first article is the "Hero"
  const heroArticle = filteredArticles[0];
  // Articles 2-4 are the "Trending Sidebar"
  const trendingArticles = filteredArticles.slice(1, 4);
  // The rest go to the main grid
  const feedArticles = filteredArticles.slice(4);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100">

      <Header />

      <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 pb-20">

        {/* Main Content - Full Width */}
        <div className="w-full">

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-blue-600/50" />
                <p className="text-gray-400 font-medium animate-pulse">Curating your briefing...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="p-6 mb-8 bg-red-50 border border-red-100 rounded-xl text-center">
                <p className="text-red-800 font-medium mb-2">Something went wrong</p>
                <p className="text-red-600 text-sm mb-4">{error}</p>
                <button onClick={() => window.location.reload()} className="text-xs bg-white border border-red-200 px-4 py-2 rounded-full hover:bg-red-50">
                  Retry
                </button>
              </div>
            )}

            {/* TRENDING NOW - Horizontal Scroll - Clean Cards */}
            {!loading && !error && trendingArticles.length > 0 && (
              <section className="mb-6 sm:mb-8 animate-fade-in-up">
                <div className="flex items-center justify-between pb-2 sm:pb-3 mb-3 sm:mb-4 border-b border-gray-200/60">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500"></span>
                    </span>
                    Trending Now
                  </h2>
                  <span className="text-[10px] sm:text-xs text-gray-400 font-medium">Live Updates</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
                  {trendingArticles.map((story, idx) => (
                    <Link
                      key={idx}
                      to={getArticleLink(story)}
                      className="flex-shrink-0 w-64 sm:w-72 md:w-80 group touch-manipulation"
                    >
                      <div className="relative rounded-xl overflow-hidden bg-gray-100 h-44 sm:h-48 shadow-md hover:shadow-xl transition-all duration-300">
                        <img
                          src={getImage(story)}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          alt={story.title}
                        />
                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        {/* Rank badge */}
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow">
                          {idx + 1}
                        </div>

                        {/* Title overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                          <span className="text-[10px] sm:text-xs font-bold text-blue-300 uppercase tracking-wide">
                            {story.section}
                          </span>
                          <h4 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-2 mt-1 group-hover:text-blue-200 transition-colors">
                            {story.title}
                          </h4>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 2. HERO SECTION - FULL WIDTH - Clean Design */}
            {!loading && !error && heroArticle && (
              <section className="mb-8 sm:mb-12 animate-fade-in-up">
                <Link to={getArticleLink(heroArticle)} className="group block relative overflow-hidden rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 touch-manipulation">
                  {/* Image Container */}
                  <div className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] w-full overflow-hidden bg-gray-200">
                    <img
                      src={getImage(heroArticle)}
                      alt={heroArticle.title}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  </div>

                  {/* Text Overlay - Simplified */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 lg:p-10">
                    {/* Section badge */}
                    <span className="inline-block bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 sm:mb-3">
                      {heroArticle.section || 'Top Story'}
                    </span>

                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight font-serif group-hover:text-blue-200 transition-colors">
                      {heroArticle.title}
                    </h1>
                  </div>
                </Link>
              </section>
            )}



            {/* 4. MAIN FEED - Clean Grid */}
            {!loading && !error && (
              <section>
                <div className="flex items-end justify-between mb-4 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Latest Feed</h2>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1 hidden sm:block">Curated stories for you</p>
                  </div>
                </div>

                {/* News Grid */}
                <NewsGrid
                  articles={visibleArticles.length > 0 ? visibleArticles : feedArticles}
                  loading={loading}
                  error={error}
                />

                {/* Load More Button - Mobile Optimized */}
                {hasMore && (
                  <div className="mt-8 sm:mt-12 md:mt-16 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadMoreLoading}
                      className="group relative px-6 sm:px-8 py-3 sm:py-3.5 bg-white border border-gray-200 text-gray-600 font-medium rounded-full hover:border-blue-500 hover:text-blue-600 active:bg-gray-50 transition-all shadow-sm hover:shadow-lg sm:hover:-translate-y-0.5 text-sm sm:text-base touch-manipulation"
                    >
                      <span className="flex items-center gap-2">
                        {loadMoreLoading ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} spin /> Loading...
                          </>
                        ) : (
                          <>
                            Load More <FontAwesomeIcon icon={faArrowDown} className="group-hover:translate-y-1 transition-transform" />
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                )}
              </section>
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

      {/* Newsletter Popup */}
      <NewsletterPopup />
    </div>
  );
};

export default HomePage;
