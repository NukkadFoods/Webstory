// Frontend article service - uses API calls to backend with fallback support
import { makeAPIRequest } from './apiConfig';
import browserCache from './browserCache';

// Legacy support - will be dynamically set by apiConfig
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment ? '' : (process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com');

/**
 * Save an article via API
 * @param {Object} articleData - Article data to save
 * @returns {Promise<Object>} Saved article
 */
export const saveArticle = async (articleData) => {
  try {
    const response = await makeAPIRequest('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(articleData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save article');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving article:', error);
    return null;
  }
};

/**
 * Save multiple articles via API
 * @param {Array<Object>} articles - Array of article data
 * @returns {Promise<Array<Object>>} Saved articles
 */
export const saveArticles = async (articles) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/articles/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ articles }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save articles');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving articles:', error);
    return [];
  }
};

/**
 * Get articles by section via API
 * @param {string} section - Section name
 * @param {number} limit - Maximum number of articles to return
 * @returns {Promise<Array<Object>>} Articles in the section
 */
export const getArticlesBySection = async (section, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/articles/section/${section}?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch articles');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error getting articles for section ${section}:`, error);
    return [];
  }
};

/**
 * Search articles by keyword via API
 * @param {string} keyword - Keyword to search for
 * @param {number} limit - Maximum number of articles to return
 * @returns {Promise<Object>} Search results with articles array
 */
export const searchArticles = async (keyword, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/articles/search?q=${encodeURIComponent(keyword)}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to search articles');
    }
    
    const data = await response.json();
    
    // Backend returns articles directly as an array, not wrapped in an object
    const articles = Array.isArray(data) ? data : (data.articles || []);
    
    // Return in the format expected by SearchPage
    return {
      articles: articles,
      totalResults: articles.length
    };
  } catch (error) {
    console.error(`Error searching articles for keyword ${keyword}:`, error);
    return {
      articles: [],
      totalResults: 0
    };
  }
};

/**
 * Get all articles via API
 * @param {number} limit - Maximum number of articles to return
 * @returns {Promise<Array<Object>>} All articles
 */
export const getAllArticles = async (limit = 100) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/articles?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch articles');
    }
    
    const data = await response.json();
    
    // Backend returns articles directly as an array, not wrapped in an object
    return Array.isArray(data) ? data : (data.articles || []);
  } catch (error) {
    console.error('Error getting all articles:', error);
    return [];
  }
};

/**
 * Get article by ID via API
 * @param {string} id - Article ID (can be MongoDB ObjectId or URL)
 * @returns {Promise<Object>} Article data
 */
export const getArticleById = async (id) => {
  try {
    // 🚀 3-TIER CACHE ARCHITECTURE
    // 1. Browser Cache (5min TTL) - Instant response
    const cachedArticle = browserCache.get(`article:${id}`);
    if (cachedArticle && cachedArticle.aiCommentary) {
      console.log(`⚡ Browser cache hit for article ${id}`);
      return cachedArticle;
    }
    
    // 2. Redis Cache (30min TTL) - Fast API response
    // 3. MongoDB (source of truth) - Fallback
    console.log(`🔄 Fetching fresh article data from Redis/DB for: ${id}`);
    
    // Use the smart endpoint that handles any identifier format
    const endpoint = `${API_BASE_URL}/api/articles/${encodeURIComponent(id)}?ai=true`;
    
    // If not found in cache, try the API
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Try alternative search methods
        console.log('Article not found by ID, trying search by title...');
        try {
          const searchResults = await searchArticles(decodeURIComponent(id), 1);
          if (searchResults.articles && searchResults.articles.length > 0) {
            return searchResults.articles[0];
          }
        } catch (searchError) {
          console.warn('Search fallback failed:', searchError);
        }
        
        throw new Error('Article not found in database. Try browsing categories first to cache articles.');
      }
      throw new Error('Failed to fetch article');
    }

    const article = await response.json();
    
    // 💾 Cache the article in browser for 5 minutes (if it has commentary)
    if (article && article.aiCommentary) {
      browserCache.set(`article:${id}`, article);
    }
    
    return article;
  } catch (error) {
    console.error(`Error getting article by ID ${id}:`, error);
    
    // Return a more helpful error object
    return {
      error: error.message,
      id: id,
      title: 'Article Not Available',
      content: `
        <p>We're sorry, but this article is not currently available.</p>
        <p><strong>Possible reasons:</strong></p>
        <ul>
          <li>The article may not be cached in our system yet</li>
          <li>The article may be from an external source</li>
          <li>There may be a temporary issue loading the content</li>
        </ul>
        <p><strong>What you can do:</strong></p>
        <ul>
          <li>Try browsing our <a href="/" class="text-blue-600 underline">homepage</a> first</li>
          <li>Check out articles in different <a href="/category/technology" class="text-blue-600 underline">categories</a></li>
          <li>Use our <a href="/search" class="text-blue-600 underline">search function</a></li>
        </ul>
      `,
      isError: true
    };
  }
};

/**
 * Delete article by URL via API
 * @param {string} url - URL of the article to delete
 * @returns {Promise<boolean>} Whether the deletion was successful
 */
export const deleteArticleByUrl = async (url) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/articles?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
    });
    
    return response.ok;
  } catch (error) {
    console.error(`Error deleting article with URL ${url}:`, error);
    return false;
  }
};

const isDev = process.env.NODE_ENV === 'development';
const BASE_URL = isDev ? '' : (process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com');

// Function to get articles using your backend API with robust error handling and fallbacks
export const getArticles = async (section = 'all', limit = 20) => {
  const cachedKey = `category_${section}`;
  
  // Helper function to retry API calls
  const retryFetch = async (url, options, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Fetching ${url}`);
        const response = await fetch(url, {
          ...options,
          timeout: 8000, // 8 second timeout per request
        });
        
        if (response.ok) {
          return response;
        } else if (response.status >= 500 && attempt < maxRetries) {
          // Server errors - retry after delay
          console.warn(`Server error ${response.status}, retrying in ${delay}ms...`);
          // eslint-disable-next-line no-loop-func
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5; // Exponential backoff
          continue;
        } else {
          // Client errors or final attempt - don't retry
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.warn(`Network error on attempt ${attempt}, retrying in ${delay}ms...`, error.message);
        // eslint-disable-next-line no-loop-func
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
  };
  
  try {
    console.log(`🔄 Fetching articles for section: ${section} via backend`);
    
    // Check for fresh cache first (< 2 minutes old)
    const cachedData = sessionStorage.getItem(cachedKey);
    const cacheTimestamp = sessionStorage.getItem(`${cachedKey}_timestamp`);
    
    if (cachedData && cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      if (cacheAge < 120000) { // Less than 2 minutes old
        console.log(`✅ Using fresh cached data for ${section} (${Math.round(cacheAge/1000)}s old)`);
        try {
          return JSON.parse(cachedData);
        } catch (parseError) {
          console.warn('Cache parse error, fetching fresh data:', parseError);
        }
      }
    }
    
    // Try multiple backend endpoints as fallbacks
    const backendUrls = [
      `${BASE_URL}/api/articles?category=${section}&limit=${limit}`,
      `${BASE_URL}/api/articles?category=home&limit=${limit}`, // Fallback to home if specific section fails
    ];
    
    for (const url of backendUrls) {
      try {
        const response = await retryFetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        console.log(`✅ Successfully fetched data from: ${url}`);
        
        const articles = Array.isArray(data) ? data : (data.articles || []);
        
        if (articles.length > 0) {
          // Cache successful results with timestamp
          sessionStorage.setItem(cachedKey, JSON.stringify(articles));
          sessionStorage.setItem(`${cachedKey}_timestamp`, Date.now().toString());
          return articles;
        }
        
      } catch (error) {
        console.warn(`Failed to fetch from ${url}:`, error.message);
      }
    }
    
    // If all backend attempts failed, check for older cached data
    if (cachedData) {
      console.log(`⚠️ All backend attempts failed, using cached data for ${section}`);
      try {
        return JSON.parse(cachedData);
      } catch (parseError) {
        console.error('Failed to parse cached data:', parseError);
      }
    }
    
    // Last resort: return sample data to prevent blank page
    console.warn(`🔄 Using fallback sample data for ${section}`);
    return getFallbackArticles(section);
    
  } catch (error) {
    console.error('❌ Critical error in getArticles:', error);
    
    // Try to return cached data even if it's old
    const cachedData = sessionStorage.getItem(cachedKey);
    if (cachedData) {
      try {
        console.log('🔄 Returning cached data due to critical error');
        return JSON.parse(cachedData);
      } catch (parseError) {
        console.error('Failed to parse cached data:', parseError);
      }
    }
    
    // Final fallback: sample articles
    return getFallbackArticles(section);
  }
};

// Fallback function to provide sample articles when backend is completely down
const getFallbackArticles = (section) => {
  const fallbackArticles = [
    {
      id: `fallback-${section}-1`,
      title: "Service Temporarily Unavailable - Please Refresh",
      abstract: "We're experiencing temporary technical difficulties. Please refresh the page to try again.",
      url: window.location.href,
      published_date: new Date().toISOString(),
      section: section === 'all' ? 'general' : section,
      multimedia: [],
      byline: "System Notice",
      source: "System"
    },
    {
      id: `fallback-${section}-2`, 
      title: "Latest News Updates Coming Soon",
      abstract: "Our news service is being updated with the latest stories. Please check back in a few moments.",
      url: window.location.href,
      published_date: new Date().toISOString(),
      section: section === 'all' ? 'general' : section,
      multimedia: [],
      byline: "Editorial Team",
      source: "System"
    }
  ];
  
  console.log(`🔄 Returning ${fallbackArticles.length} fallback articles for section: ${section}`);
  return fallbackArticles;
};
