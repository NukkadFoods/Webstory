import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTopStories } from '../services/storyService';
import useLoadMore from '../hooks/useLoadMore';
import NewsGrid from '../components/NewsGrid';
import FluidAd from '../components/FluidAd';
import Header from '../components/Header';
import ReelsSidebar from '../components/ReelsSidebar';
import logo from '../logo/1756335129.png';

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

      <div className="w-full pl-4 pr-0 py-8">
        
        <div className="grid grid-cols-[1fr_auto] gap-6">
          {/* Main Content - takes remaining space */}
          <div className="min-w-0">
        
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

        {/* TRENDING NOW - Horizontal Scroll */}
        {!loading && !error && trendingArticles.length > 0 && (
          <section className="mb-8 animate-fade-in-up">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200/60">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                Trending Now
              </h2>
              <span className="text-xs text-gray-400 font-medium">Live Updates</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {trendingArticles.map((story, idx) => (
                <Link 
                  key={idx} 
                  to={getArticleLink(story)}
                  className="flex-shrink-0 w-72 flex gap-4 p-3 rounded-xl bg-white border border-transparent hover:border-gray-100 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
                    <img 
                      src={getImage(story)} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      alt="" 
                    />
                    <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 rounded">
                      #{idx + 1}
                    </div>
                  </div>
                  <div className="flex flex-col justify-between py-1">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                        {story.section}
                      </span>
                      <h4 className="font-semibold text-gray-800 leading-snug line-clamp-3 mt-1 group-hover:text-blue-700 transition-colors">
                        {story.title}
                      </h4>
                    </div>
                    <span className="text-xs text-gray-400 mt-2">{story.published_date ? new Date(story.published_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 2. HERO SECTION - FULL WIDTH */}
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
                    {/* The "Readability" Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  </div>

                  {/* Text Overlay */}
                  <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full z-10">
                    
                    {/* Tags Row */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-blue-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                        {heroArticle.section || 'Top Story'}
                      </span>
                      {/* AI BADGE */}
                      <span className="backdrop-blur-md bg-white/20 border border-white/30 text-white text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                        <FontAwesomeIcon icon={faRobot} className="text-indigo-300" /> 
                        <span>AI Analysis Ready</span>
                      </span>
                    </div>

                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 font-serif text-shadow-sm">
                      {heroArticle.title}
                    </h1>
                    
                    <p className="hidden md:block text-gray-200 text-lg line-clamp-2 max-w-3xl mb-6 leading-relaxed">
                      {heroArticle.abstract || heroArticle.summary}
                    </p>

                    <div className="flex items-center text-gray-300 text-sm font-medium">
                      <span className="uppercase tracking-widest text-xs">{heroArticle.byline || 'Nukkad Team'}</span>
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

  

        {/* 4. MAIN FEED (MASONRY STYLE) */}
        {!loading && !error && (
          <section>
            <div className="flex items-end justify-between mb-6 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Latest Feed</h2>
                <p className="text-gray-500 mt-1">Curated stories for you based on your interests</p>
              </div>
            </div>

            {/* Passing the sliced feed data to your existing Grid component */}
            <NewsGrid 
              articles={visibleArticles.length > 0 ? visibleArticles : feedArticles} 
              loading={loading} 
              error={error} 
            />

            {/* Load More Trigger */}
            {hasMore && (
              <div className="mt-16 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadMoreLoading}
                  className="group relative px-8 py-3.5 bg-white border border-gray-200 text-gray-600 font-medium rounded-full hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                >
                  <span className="flex items-center gap-2">
                    {loadMoreLoading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin /> Loading Content
                      </>
                    ) : (
                      <>
                        Load More Stories <FontAwesomeIcon icon={faArrowDown} className="group-hover:translate-y-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </div>
            )}
          </section>
        )}
          </div>

          {/* Reels Sidebar - Fixed to right */}
          <ReelsSidebar />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
