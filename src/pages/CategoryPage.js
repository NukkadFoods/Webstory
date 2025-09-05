import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTopStories } from '../services/storyService';
import { getWallStreetArticles } from '../services/wallStreetService';
import { getEntertainmentArticles } from '../services/entertainmentService';
import { getFinanceArticles } from '../services/financeService';
import NewsCard from '../components/NewsCard';
import FluidAd from '../components/FluidAd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';

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

  return (
    <div className="category-page max-w-6xl mx-auto px-4">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">{displayName} News</h1>
        <Link to="/" className="mt-2 sm:mt-0 inline-flex items-center text-blue-700">
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Back to home
        </Link>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.length > 0 ? (
              articles.map((article, index) => (
                <React.Fragment key={article.uri || article.id || article.title}>
                  <NewsCard article={article} />
                  {/* Add in-feed ad after every 8 articles for better content-to-ad ratio */}
                  {(index + 1) % 8 === 0 && index < articles.length - 1 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                      <FluidAd className="my-4" />
                    </div>
                  )}
                </React.Fragment>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <h2 className="text-2xl font-bold mb-4">No articles found</h2>
                <p className="text-gray-600">No articles are currently available for this category.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryPage;