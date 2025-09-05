// Finance Service - Fetches finance articles from NewsData.io API
import { saveArticles, getArticlesBySection } from './articleService';

const API_KEY = process.env.REACT_APP_NEWSDATA_KEY || 'pub_82794a899d0b523c3007e07bd467b5884cb3a';
const BASE_URL = 'https://newsdata.io/api/1/latest';

// Collection of financial images to use as fallbacks
const FALLBACK_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Stock market financial data',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Financial charts and graphs',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Financial analysis workspace',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Bull market financial concept',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1115&q=80',
    caption: 'Digital finance dashboard',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Financial analytics',
    credit: 'Unsplash',
  },
];

/**
 * Get a random fallback image for finance articles
 * @returns {Object} - Random image object
 */
const getRandomFallbackImage = () => {
  const randomIndex = Math.floor(Math.random() * FALLBACK_IMAGES.length);
  return FALLBACK_IMAGES[randomIndex];
};

/**
 * Fetch finance articles from NewsData.io API
 * @param {number} page - Page number for pagination
 * @param {number} pageSize - Number of articles per page
 * @returns {Promise<Object>} - Finance articles data
 */
export const getFinanceArticles = async (page = 0, pageSize = 20) => {
  try {
    console.log('Fetching finance articles from NewsData.io API');
    
    // Check if we're in production by looking at the hostname
    const isProduction = 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';
    
    // If in production, try to get articles from DB first
    if (isProduction) {
      console.log('Running in production, trying to fetch from database first');
      try {
        const dbArticles = await getArticlesBySection('finance', pageSize);
        if (dbArticles && dbArticles.length > 0) {
          console.log(`Retrieved ${dbArticles.length} finance articles from database`);
          // Cache articles from DB in session storage
          sessionStorage.setItem('finance_articles', JSON.stringify(dbArticles));
          return {
            articles: dbArticles,
            fromDatabase: true
          };
        }
      } catch (dbError) {
        console.error('Error fetching finance articles from database:', dbError);
      }
    }
    
    // Build the API URL with finance query and filter to US news with timezone
    const url = `${BASE_URL}?apikey=${API_KEY}&q=finance&country=us&timezone=America/Chicago${page > 0 ? `&page=${page}` : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "success") {
      throw new Error(`API Error: ${data.message || 'Unknown error'}`);
    }
    
    console.log(`Fetched ${data.results?.length || 0} US finance articles`);
    
    // Process articles to match our application's format
    const processedArticles = data.results.map(article => {
      // Use article's image if available, otherwise use a random fallback image
      const multimedia = article.image_url 
        ? [
            {
              url: article.image_url,
              type: 'image',
              caption: article.title,
              height: 480,
              width: 720
            }
          ]
        : [
            {
              ...getRandomFallbackImage(),
              type: 'image',
              height: 480,
              width: 720
            }
          ];
      
      return {
        id: article.article_id || `finance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: article.title || 'Finance News',
        abstract: article.description || article.content?.substring(0, 200) + '...' || 'Latest finance news and market updates.',
        byline: article.source_id || 'Finance News',
        published_date: article.pubDate || new Date().toISOString(),
        updated_date: article.pubDate || new Date().toISOString(),
        section: 'finance',
        subsection: 'markets',
        url: article.link || '#',
        multimedia: multimedia,
        keywords: article.keywords || ['finance', 'markets', 'economy'],
        content: article.content || article.description || 'Full content not available.',
        source: article.source_id || 'NewsData.io',
        category: ['finance', 'business', 'markets'],
        country: ['US'],
        language: 'en'
      };
    });
    
    // Save articles to MongoDB in the background
    saveArticles(processedArticles)
      .then(savedArticles => {
        console.log(`Saved ${savedArticles.length} finance articles to MongoDB`);
      })
      .catch(error => {
        console.error('Error saving finance articles to MongoDB:', error);
      });
    
    // Cache in session storage
    sessionStorage.setItem('finance_articles', JSON.stringify(processedArticles));
    
    return {
      articles: processedArticles,
      totalResults: data.totalResults || processedArticles.length,
      currentPage: page,
      nextPage: data.nextPage || null
    };
  } catch (error) {
    console.error('Error fetching finance articles:', error);
    
    // Try to get articles from cache
    try {
      const cachedArticles = JSON.parse(sessionStorage.getItem('finance_articles') || '[]');
      
      if (cachedArticles.length > 0) {
        console.log(`Retrieved ${cachedArticles.length} finance articles from cache`);
        return {
          articles: cachedArticles,
          fromCache: true
        };
      }
    } catch (cacheError) {
      console.error('Error retrieving cached finance articles:', cacheError);
    }
    
    // If not in cache, try to get from database as last resort
    try {
      const dbArticles = await getArticlesBySection('finance', pageSize);
      if (dbArticles && dbArticles.length > 0) {
        console.log(`Retrieved ${dbArticles.length} finance articles from database as fallback`);
        // Cache articles from DB
        sessionStorage.setItem('finance_articles', JSON.stringify(dbArticles));
        return {
          articles: dbArticles,
          fromDatabase: true
        };
      }
    } catch (dbError) {
      console.error('Error fetching finance articles from database as fallback:', dbError);
    }
    
    return {
      articles: [],
      error: 'Failed to fetch finance articles. Please try again later.',
      isError: true
    };
  }
};

/**
 * Get a finance article by URL
 * @param {string} url - URL of the article
 * @returns {Promise<Object>} - Article data
 */
export const getFinanceArticleByUrl = async (url) => {
  try {
    console.log('Looking for finance article with URL:', url);
    
    // Try to find in cached articles first
    const cachedArticles = JSON.parse(sessionStorage.getItem('finance_articles') || '[]');
    const cachedArticle = cachedArticles.find(article => article.url === url);
    
    if (cachedArticle) {
      console.log('Found finance article in cache');
      return cachedArticle;
    }
    
    // If not found in cache, fetch all articles and find it
    const { articles } = await getFinanceArticles(0, 100);
    const article = articles.find(article => article.url === url);
    
    if (article) {
      return article;
    }
    
    throw new Error('Article not found');
  } catch (error) {
    console.error('Error getting finance article:', error);
    return {
      error: 'Finance article not found.',
      isError: true
    };
  }
};
