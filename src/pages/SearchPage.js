import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchArticles } from '../services/articleService';
import NewsCard from '../components/NewsCard';
import FluidAd from '../components/FluidAd';
import Header from '../components/Header';
import ReelsSidebar from '../components/ReelsSidebar';
import { ArrowLeft, Search, Loader2, ArrowDown } from 'lucide-react';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allArticles, setAllArticles] = useState([]);
  const [displayedArticles, setDisplayedArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const [showReels, setShowReels] = useState(false);

  const query = searchParams.get('q');
  const INITIAL_DISPLAY_COUNT = 6; // 2 rows × 3 columns (on desktop)

  useEffect(() => {
    if (!query) {
      setAllArticles([]);
      setDisplayedArticles([]);
      return;
    }

    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        setCurrentPage(1);
        
        const data = await searchArticles(query, 1);
        // Handle the correct response structure from searchArticles
        if (data && data.articles) {
          const articles = data.articles;
          setAllArticles(articles);
          
          // Only display the first two rows initially
          setDisplayedArticles(articles.slice(0, INITIAL_DISPLAY_COUNT));
          
          setTotalResults(data.totalResults || articles.length);
          
          // Set hasMoreArticles to true if there are more articles than what we're displaying
          setHasMoreArticles(articles.length > INITIAL_DISPLAY_COUNT);
          console.log(`Search results: ${articles.length} articles loaded, showing ${Math.min(INITIAL_DISPLAY_COUNT, articles.length)} initially`);
        } else {
          // Fallback in case the function returns just an array (for backward compatibility)
          const articles = Array.isArray(data) ? data : [];
          setAllArticles(articles);
          setDisplayedArticles(articles.slice(0, INITIAL_DISPLAY_COUNT));
          setTotalResults(articles.length);
          setHasMoreArticles(articles.length > INITIAL_DISPLAY_COUNT);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to fetch search results:', err);
        setError('Failed to load search results. Please try again later.');
        setAllArticles([]);
        setDisplayedArticles([]);
        setHasMoreArticles(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
    }
  };

  const handleLoadMore = () => {
    if (loadingMore) return;
    
    setLoadingMore(true);
    
    // Simple approach: just show more articles from the ones we've already loaded
    setTimeout(() => {
      const nextBatch = allArticles.slice(0, displayedArticles.length + INITIAL_DISPLAY_COUNT);
      setDisplayedArticles(nextBatch);
      setHasMoreArticles(nextBatch.length < allArticles.length);
      setLoadingMore(false);
      
      console.log(`Now showing ${nextBatch.length} of ${allArticles.length} articles`);
      
      // If we've shown all articles from current page, fetch more from API for next time
      if (nextBatch.length >= allArticles.length && totalResults > allArticles.length) {
        fetchMoreArticles();
      }
    }, 500); // Small delay to show loading state
  };
  
  // Function to fetch the next page of articles from the API
  const fetchMoreArticles = async () => {
    try {
      const nextPage = currentPage + 1;
      console.log(`Fetching more articles, page ${nextPage}`);
      
      const data = await searchArticles(query, nextPage);
      
      if (data && data.articles && data.articles.length > 0) {
        // Get unique identifiers for existing articles to avoid duplicates
        const existingArticleIds = new Set(
          allArticles.map(article => article.id || article.uri || article.url || article.title)
        );
        
        // Filter out any articles that already exist in our collection
        const uniqueNewArticles = data.articles.filter(article => {
          const articleId = article.id || article.uri || article.url || article.title;
          return !existingArticleIds.has(articleId);
        });
        
        if (uniqueNewArticles.length > 0) {
          console.log(`Loaded ${uniqueNewArticles.length} new unique articles from API (filtered out ${data.articles.length - uniqueNewArticles.length} duplicates)`);
          
          // Append only unique articles to the existing collection
          setAllArticles(prevArticles => [...prevArticles, ...uniqueNewArticles]);
          setCurrentPage(nextPage);
        } else {
          console.log(`No unique articles found on page ${nextPage} - all were duplicates`);
          // If we got no new unique articles but there are theoretically more results,
          // try fetching the next page
          if (totalResults > allArticles.length) {
            console.log("Attempting to fetch next page for more unique content");
            setCurrentPage(nextPage); // Increment page counter for next fetch attempt
          } else {
            // If we've reached the total results count, there's no more to load
            setHasMoreArticles(false);
          }
        }
      } else {
        // No more articles available from API
        setHasMoreArticles(false);
      }
    } catch (err) {
      console.error('Failed to prefetch more results:', err);
      // Don't show error to user since they haven't explicitly requested these articles yet
    }
  };

  return (
    <div className="search-page min-h-screen bg-gray-50">
      <Header />

      <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 pb-20">
        <div className="w-full">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">Search Results</h1>
            <Link to="/" className="inline-flex items-center text-blue-700 text-sm sm:text-base">
              <ArrowLeft size={16} className="mr-2" /> Back to home
            </Link>
          </div>

          <div className="mb-6 sm:mb-8">
            <form onSubmit={handleSearch} className="flex max-w-xl">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search for articles..."
                className="flex-grow px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base touch-manipulation flex items-center"
              >
                <Search size={18} className="sm:mr-2" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </form>
          </div>

          {query && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4 sm:mb-6">
              <p className="text-gray-600 text-sm sm:text-base">
                Showing results for: <span className="font-semibold">{query}</span>
              </p>
              {totalResults > 0 && (
                <p className="text-xs sm:text-sm text-gray-500">
                  {displayedArticles.length} of {totalResults} results
                </p>
              )}
            </div>
          )}

          {loading && (
            <div className="flex justify-center my-12">
              <Loader2 size={48} className="text-blue-600 animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {displayedArticles.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
                    {displayedArticles.map((article, index) => (
                      <React.Fragment key={article.id || article.uri}>
                        <NewsCard article={article} />
                        {(index + 1) % 10 === 0 && index < displayedArticles.length - 1 && (
                          <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4">
                            <FluidAd className="my-4" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {(hasMoreArticles || displayedArticles.length < allArticles.length) && (
                    <div className="flex justify-center mt-8 sm:mt-12">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm sm:text-base touch-manipulation"
                        data-testid="load-more-button"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ArrowDown size={16} className="mr-2" />
                            Load More
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                query && (
                  <div className="text-center py-12">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4">No results found</h2>
                    <p className="text-gray-600 text-sm sm:text-base">
                      No articles match your search query. Please try different keywords.
                    </p>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Reels Slider - Hidden by default, slide up on click */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${showReels ? 'translate-y-0' : 'translate-y-full'}`}>
        <button
          onClick={() => setShowReels(!showReels)}
          className="absolute -top-11 sm:-top-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 sm:px-6 py-2.5 sm:py-2 rounded-t-xl font-bold text-xs sm:text-sm shadow-lg flex items-center gap-1.5 sm:gap-2 touch-manipulation active:from-pink-600 active:to-purple-700"
        >
          <span>🎬</span>
          <span>Reels</span>
          <span className={`transition-transform duration-300 ${showReels ? 'rotate-180' : ''}`}>▲</span>
        </button>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 sm:p-4 shadow-2xl max-h-[50vh] sm:max-h-none overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <ReelsSidebar horizontal={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;