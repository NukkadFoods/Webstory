// Wall Street Service - Fetches articles from WSJ using NewsData.io API
import { saveArticles, getArticlesBySection } from './articleService';

const API_KEY = process.env.REACT_APP_NEWSDATA_KEY || 'pub_82794a899d0b523c3007e07bd467b5884cb3a';
const BASE_URL = 'https://newsdata.io/api/1/news';

// Collection of financial and trading-related stock images to use as fallbacks
const FALLBACK_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Wall Street Bull statue',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Stock market trading graph',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'NYSE trading floor',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80',
    caption: 'Wall Street sign with American flag',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Stock market data on digital display',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1560221328-12fe60f83ab8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1174&q=80',
    caption: 'Financial chart with bull market trend',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1642543348745-03b1219733d9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Stock market investment data',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1468254095679-bbcba94a7066?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1169&q=80',
    caption: 'New York City financial district',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'S&P 500 trading chart',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80',
    caption: 'Wall Street skyscrapers',
    credit: 'Unsplash',
  }
];

/**
 * Get a random fallback image for articles without images
 * @returns {Object} - Image object with url, caption, and credit
 */
const getRandomFallbackImage = () => {
  const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
  return FALLBACK_IMAGES[randomIndex];
};

/**
 * Fetch articles from Wall Street Journal via NewsData.io API
 * @param {number} page - Page number for pagination (starts at 0)
 * @param {number} pageSize - Number of results per page
 * @returns {Promise<Object>} - Wall Street Journal articles
 */
export const getWallStreetArticles = async (page = 0, pageSize = 20) => {
  try {
    console.log('Fetching Wall Street articles from NewsData.io API');
    
    // Check if we're in production by looking at the hostname
    const isProduction = 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';
    
    // If in production, try to get articles from DB first
    if (isProduction) {
      console.log('Running in production, trying to fetch from database first');
      try {
        const dbArticles = await getArticlesBySection('wallstreet', pageSize);
        if (dbArticles && dbArticles.length > 0) {
          console.log(`Retrieved ${dbArticles.length} Wall Street articles from database`);
          // Cache articles from DB in session storage
          sessionStorage.setItem('wallstreet_articles', JSON.stringify(dbArticles));
          return {
            articles: dbArticles,
            fromDatabase: true
          };
        }
      } catch (dbError) {
        console.error('Error fetching Wall Street articles from database:', dbError);
      }
    }
    
    // Build the API URL with Wall Street search query and filter to US news
    const url = `${BASE_URL}?apikey=${API_KEY}&q=wall%20street&language=en&country=us${page > 0 ? `&page=${page}` : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "success") {
      throw new Error(`API Error: ${data.message || 'Unknown error'}`);
    }
    
    console.log(`Fetched ${data.results?.length || 0} Wall Street articles`);
    
    // Process articles to match our application's format
    const processedArticles = data.results.map(article => {
      // Use article's image if available, otherwise use a random fallback image
      const multimedia = article.image_url 
        ? [
            {
              url: article.image_url,
              type: 'image',
              caption: article.title,
              height: 600,
              width: 800,
              credit: article.source_id || 'NewsData.io'
            }
          ] 
        : (() => {
            // Get random fallback image when article has no image
            const fallbackImage = getRandomFallbackImage();
            return [
              {
                url: fallbackImage.url,
                type: 'image',
                caption: fallbackImage.caption,
                height: 600,
                width: 800,
                credit: fallbackImage.credit,
                isFallback: true
              }
            ];
          })();
          
      return {
        id: article.link,
        title: article.title,
        abstract: article.description,
        byline: article.creator?.join(', ') || article.source_id || 'Wall Street News',
        published_date: article.pubDate,
        section: 'wallstreet',
        url: article.link,
        multimedia: multimedia,
        content: article.content || article.description,
        source: article.source_id || 'NewsData.io',
        country: 'us'
      };
    });
    
    // Save articles to MongoDB in the background
    saveArticles(processedArticles)
      .then(savedArticles => {
        console.log(`Saved ${savedArticles.length} Wall Street articles to MongoDB`);
      })
      .catch(error => {
        console.error('Error saving Wall Street articles to MongoDB:', error);
      });
    
    // Cache in session storage
    sessionStorage.setItem('wallstreet_articles', JSON.stringify(processedArticles));
    
    return {
      articles: processedArticles,
      totalResults: data.totalResults || processedArticles.length,
      currentPage: page,
      nextPage: data.nextPage || null
    };
  } catch (error) {
    console.error('Error fetching Wall Street articles:', error);
    
    // Try to get articles from cache
    try {
      const cachedArticles = JSON.parse(sessionStorage.getItem('wallstreet_articles') || '[]');
      
      if (cachedArticles.length > 0) {
        console.log(`Retrieved ${cachedArticles.length} Wall Street articles from cache`);
        return {
          articles: cachedArticles,
          fromCache: true
        };
      }
    } catch (cacheError) {
      console.error('Error retrieving cached Wall Street articles:', cacheError);
    }
    
    // If not in cache, try to get from database as last resort
    try {
      const dbArticles = await getArticlesBySection('wallstreet', pageSize);
      if (dbArticles && dbArticles.length > 0) {
        console.log(`Retrieved ${dbArticles.length} Wall Street articles from database as fallback`);
        // Cache articles from DB
        sessionStorage.setItem('wallstreet_articles', JSON.stringify(dbArticles));
        return {
          articles: dbArticles,
          fromDatabase: true
        };
      }
    } catch (dbError) {
      console.error('Error fetching Wall Street articles from database as fallback:', dbError);
    }
    
    return {
      articles: [],
      error: 'Failed to fetch Wall Street articles. Please try again later.',
      isError: true
    };
  }
};

/**
 * Get a Wall Street Journal article by URL
 * @param {string} url - URL of the article
 * @returns {Promise<Object>} - Article data
 */
export const getWallStreetArticleByUrl = async (url) => {
  try {
    console.log('Looking for Wall Street article with URL:', url);
    
    // Try to find in cached articles first
    const cachedArticles = JSON.parse(sessionStorage.getItem('wallstreet_articles') || '[]');
    const cachedArticle = cachedArticles.find(article => article.url === url);
    
    if (cachedArticle) {
      console.log('Found Wall Street article in cache');
      return cachedArticle;
    }
    
    // If not found in cache, fetch all articles and find it
    const { articles } = await getWallStreetArticles(0, 100);
    const article = articles.find(article => article.url === url);
    
    if (article) {
      return article;
    }
    
    throw new Error('Article not found');
  } catch (error) {
    console.error('Error getting Wall Street article:', error);
    return {
      error: 'Wall Street article not found.',
      isError: true
    };
  }
};