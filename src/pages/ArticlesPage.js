import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchArticles, getArticles } from '../services/articleService';
import { mockCategories } from '../services/mockData';
import NewsCard from '../components/NewsCard';
import TrendingTopics from '../components/TrendingTopics';
import FluidAd from '../components/FluidAd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSpinner, faNewspaper } from '@fortawesome/free-solid-svg-icons';

const ArticlesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isSearchMode, setIsSearchMode] = useState(!!searchParams.get('q'));

  // List of available categories
  const categories = [
    { id: 'all', name: 'All Categories' },
    ...mockCategories.map(cat => ({ id: cat.id, name: cat.name }))
  ];

  useEffect(() => {
    if (searchParams.get('q')) {
      setIsSearchMode(true);
      setSearchQuery(searchParams.get('q'));
    } else {
      setIsSearchMode(false);
    }
  }, [searchParams]);

  // Fetch articles when params change
  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        if (isSearchMode) {
          // Search mode - use search API
          const searchData = await searchArticles(searchQuery, page, selectedCategory);
          setArticles(searchData.articles);
          setTotalPages(Math.ceil(searchData.totalResults / 10));
        } else {
          // Default mode - use News API for articles
          const articlesData = await getArticles(selectedCategory === 'all' ? 'all' : selectedCategory);
          setArticles(articlesData);
          
          // Store in session storage for later use
          if (articlesData && articlesData.length > 0) {
            sessionStorage.setItem('articles', JSON.stringify(articlesData));
          }
          
          // Set a reasonable number for pagination
          setTotalPages(Math.ceil(articlesData.length / 10));
        }
      } catch (err) {
        console.warn('Error fetching content, using fallback:', err);
        
        // Never show error to user - instead try fallback strategies
        try {
          // Try to get cached articles first
          const cachedArticles = sessionStorage.getItem('articles');
          if (cachedArticles) {
            const parsed = JSON.parse(cachedArticles);
            if (parsed && parsed.length > 0) {
              setArticles(parsed);
              setTotalPages(Math.ceil(parsed.length / 10));
              console.log('✅ Using cached articles as fallback');
              return;
            }
          }
        } catch (cacheError) {
          console.warn('Cache fallback failed:', cacheError);
        }
        
        // Final fallback: provide sample content so page isn't blank
        const fallbackArticles = [
          {
            id: 'loading-1',
            title: 'News Loading - Please Wait',
            abstract: 'We are loading the latest news articles for you. This page will update automatically.',
            published_date: new Date().toISOString(),
            section: selectedCategory,
            multimedia: [],
            byline: 'Editorial Team'
          },
          {
            id: 'loading-2', 
            title: 'Latest Updates Coming Soon',
            abstract: 'Fresh news content is being loaded. Thank you for your patience.',
            published_date: new Date().toISOString(),
            section: selectedCategory,
            multimedia: [],
            byline: 'News Team'
          }
        ];
        
        setArticles(fallbackArticles);
        setTotalPages(1);
        
        // Try to refresh data in background after a delay
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [searchQuery, selectedCategory, page, isSearchMode]);

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setIsSearchMode(!!searchQuery);
    setSearchParams({ q: searchQuery, category: selectedCategory });
  };

  // Handle category change
  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    setPage(1);
    
    if (isSearchMode) {
      setSearchParams({ q: searchQuery, category: newCategory });
    } else {
      setSearchParams({ category: newCategory });
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo(0, 0);
    }
  };

  // Clear search and show regular articles
  const handleShowAllArticles = () => {
    setIsSearchMode(false);
    setSearchQuery('');
    setPage(1);
    setSearchParams({ category: selectedCategory === 'all' ? '' : selectedCategory });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6 text-center">
          {isSearchMode ? 'Search Results' : 'Latest News Articles'}
        </h1>
        
        {/* Search and filter form */}
        <form onSubmit={handleSearch} className="mb-8 max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex rounded-md shadow-sm flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for articles..."
                className="flex-1 px-4 py-2 rounded-l-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-700 px-4 py-2 text-white rounded-r-md hover:bg-blue-800 transition duration-200"
                disabled={!searchQuery}
              >
                <FontAwesomeIcon icon={faSearch} />
              </button>
            </div>
            
            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Current filters display */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-gray-600">
            {selectedCategory !== 'all' && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-2">
                Category: {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
              </span>
            )}
            {isSearchMode && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                Search: "{searchQuery}"
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {isSearchMode && (
              <button
                onClick={handleShowAllArticles}
                className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                <FontAwesomeIcon icon={faNewspaper} />
                Show all articles
              </button>
            )}
            {(selectedCategory !== 'all' || isSearchMode) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setIsSearchMode(false);
                  setSearchParams({});
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center my-12">
            <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-blue-600" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {!loading && !error && (
          <>
            {articles.length > 0 ? (
              <>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {articles.map((article, index) => (
                    <React.Fragment key={article.id}>
                      <NewsCard
                        id={article.id}
                        title={article.title}
                        abstract={article.abstract}
                        image={article.multimedia && article.multimedia.length > 0 ? article.multimedia[0].url : null}
                        date={article.published_date}
                        source="New York Times"
                        url={article.url}
                        category={article.section}
                      />
                      {/* Add in-feed ad after every 8 articles */}
                      {(index + 1) % 8 === 0 && index < articles.length - 1 && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <FluidAd className="my-4" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-lg text-gray-600">No articles found. Try a different search term or category.</p>
            )}

            {/* Pagination */}
            {articles.length > 0 && totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <nav className="inline-flex rounded-md shadow">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className={`px-4 py-2 rounded-l-md border ${
                      page === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-blue-700 hover:bg-gray-50'
                    } focus:outline-none`}
                  >
                    Previous
                  </button>
                  <div className="px-4 py-2 border-t border-b bg-white text-blue-700">
                    Page {page} of {totalPages || 1}
                  </div>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className={`px-4 py-2 rounded-r-md border ${
                      page >= totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-blue-700 hover:bg-gray-50'
                    } focus:outline-none`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ArticlesPage;