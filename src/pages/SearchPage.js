import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchArticles } from '../services/articleService';
import NewsCard from '../components/NewsCard';
import FluidAd from '../components/FluidAd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSearch, faSpinner, faArrowDown } from '@fortawesome/free-solid-svg-icons';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allArticles, setAllArticles] = useState([]); // Store all fetched articles
  const [displayedArticles, setDisplayedArticles] = useState([]); // Articles currently displayed
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreArticles, setHasMoreArticles] = useState(true);

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
    <div className="search-page">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Search Results</h1>
        <Link to="/" className="inline-flex items-center text-blue-700">
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Back to home
        </Link>
      </div>

      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex max-w-lg">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search for articles..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-700 text-white px-6 py-2 rounded-r hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FontAwesomeIcon icon={faSearch} className="mr-2" /> Search
          </button>
        </form>
      </div>

      {query && (
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Showing results for: <span className="font-semibold">{query}</span>
          </p>
          {totalResults > 0 && (
            <p className="text-sm text-gray-500">
              {displayedArticles.length} of {totalResults} results
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center my-12">
          <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-blue-600" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedArticles.map((article, index) => (
                  <React.Fragment key={article.id || article.uri}>
                    <NewsCard article={article} />
                    {/* Add in-feed ad after every 10 articles in search results */}
                    {(index + 1) % 10 === 0 && index < displayedArticles.length - 1 && (
                      <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <FluidAd className="my-4" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              
              {/* Load More Button - Always showing if we have more articles to display */}
              {(hasMoreArticles || displayedArticles.length < allArticles.length) && (
                <div className="flex justify-center mt-10 mb-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    data-testid="load-more-button"
                  >
                    {loadingMore ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                        Loading more articles...
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
            </>
          ) : (
            query && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold mb-4">No results found</h2>
                <p className="text-gray-600">
                  No articles match your search query. Please try different keywords.
                </p>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};

export default SearchPage;