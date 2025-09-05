// Entertainment Service - Fetches entertainment articles from NewsData.io API
import { saveArticles, getArticlesBySection } from './articleService';

const API_KEY = process.env.REACT_APP_NEWSDATA_KEY || 'pub_82794a899d0b523c3007e07bd467b5884cb3a';
const BASE_URL = 'https://newsdata.io/api/1/news';

// Collection of entertainment-related stock images to use as fallbacks
const FALLBACK_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Movie theater',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1156&q=80',
    caption: 'Hollywood sign',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1504730030853-eff311f57d3c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Music concert',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1616469829941-c7200edec809?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Film set',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Theater stage',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Concert performance',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1596111905912-758b8e530298?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    caption: 'Celebrity red carpet',
    credit: 'Unsplash',
  },
  {
    url: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1171&q=80',
    caption: 'Premiere night',
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
 * Fetch entertainment articles from NewsData.io API
 * @param {number} page - Page number for pagination (starts at 0)
 * @param {number} pageSize - Number of results per page
 * @returns {Promise<Object>} - Entertainment articles
 */
export const getEntertainmentArticles = async (page = 0, pageSize = 20) => {
  try {
    console.log('Fetching entertainment articles from NewsData.io API');
    
    // Check if we're in production by looking at the hostname
    const isProduction = 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';
    
    // If in production, try to get articles from DB first
    if (isProduction) {
      console.log('Running in production, trying to fetch from database first');
      try {
        const dbArticles = await getArticlesBySection('entertainment', pageSize);
        if (dbArticles && dbArticles.length > 0) {
          console.log(`Retrieved ${dbArticles.length} entertainment articles from database`);
          // Cache articles from DB in session storage
          sessionStorage.setItem('entertainment_articles', JSON.stringify(dbArticles));
          return {
            articles: dbArticles,
            fromDatabase: true
          };
        }
      } catch (dbError) {
        console.error('Error fetching entertainment articles from database:', dbError);
      }
    }
    
    // Build the API URL with entertainment query and filter to US news only
    const url = `${BASE_URL}?apikey=${API_KEY}&q=entertainment&language=en&country=us${page > 0 ? `&page=${page}` : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "success") {
      throw new Error(`API Error: ${data.message || 'Unknown error'}`);
    }
    
    console.log(`Fetched ${data.results?.length || 0} US entertainment articles`);
    
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
        byline: article.creator?.join(', ') || article.source_id || 'Entertainment News',
        published_date: article.pubDate,
        section: 'entertainment',
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
        console.log(`Saved ${savedArticles.length} entertainment articles to MongoDB`);
      })
      .catch(error => {
        console.error('Error saving entertainment articles to MongoDB:', error);
      });
    
    // Cache in session storage
    sessionStorage.setItem('entertainment_articles', JSON.stringify(processedArticles));
    
    return {
      articles: processedArticles,
      totalResults: data.totalResults || processedArticles.length,
      currentPage: page,
      nextPage: data.nextPage || null
    };
  } catch (error) {
    console.error('Error fetching entertainment articles:', error);
    
    // Try to get articles from cache
    try {
      const cachedArticles = JSON.parse(sessionStorage.getItem('entertainment_articles') || '[]');
      
      if (cachedArticles.length > 0) {
        console.log(`Retrieved ${cachedArticles.length} entertainment articles from cache`);
        return {
          articles: cachedArticles,
          fromCache: true
        };
      }
    } catch (cacheError) {
      console.error('Error retrieving cached entertainment articles:', cacheError);
    }
    
    // If not in cache, try to get from database as last resort
    try {
      const dbArticles = await getArticlesBySection('entertainment', pageSize);
      if (dbArticles && dbArticles.length > 0) {
        console.log(`Retrieved ${dbArticles.length} entertainment articles from database as fallback`);
        // Cache articles from DB
        sessionStorage.setItem('entertainment_articles', JSON.stringify(dbArticles));
        return {
          articles: dbArticles,
          fromDatabase: true
        };
      }
    } catch (dbError) {
      console.error('Error fetching entertainment articles from database as fallback:', dbError);
    }
    
    return {
      articles: [],
      error: 'Failed to fetch entertainment articles. Please try again later.',
      isError: true
    };
  }
};

/**
 * Get an entertainment article by URL
 * @param {string} url - URL of the article
 * @returns {Promise<Object>} - Article data
 */
export const getEntertainmentArticleByUrl = async (url) => {
  try {
    console.log('Looking for entertainment article with URL:', url);
    
    // Try to find in cached articles first
    const cachedArticles = JSON.parse(sessionStorage.getItem('entertainment_articles') || '[]');
    const cachedArticle = cachedArticles.find(article => article.url === url);
    
    if (cachedArticle) {
      console.log('Found entertainment article in cache');
      return cachedArticle;
    }
    
    // If not found in cache, fetch all articles and find it
    const { articles } = await getEntertainmentArticles(0, 100);
    const article = articles.find(article => article.url === url);
    
    if (article) {
      return article;
    }
    
    throw new Error('Article not found');
  } catch (error) {
    console.error('Error getting entertainment article:', error);
    return {
      error: 'Entertainment article not found.',
      isError: true
    };
  }
};