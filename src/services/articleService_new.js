// Frontend article service - uses API calls to backend
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment ? '' : (process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com');

/**
 * Save an article via API
 * @param {Object} articleData - Article data to save
 * @returns {Promise<Object>} Saved article
 */
export const saveArticle = async (articleData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/articles`, {
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
 * @returns {Promise<Array<Object>>} Matching articles
 */
export const searchArticles = async (keyword, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/articles/search?q=${encodeURIComponent(keyword)}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to search articles');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error searching articles for keyword ${keyword}:`, error);
    return [];
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
    
    return await response.json();
  } catch (error) {
    console.error('Error getting all articles:', error);
    return [];
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

// AI Reporter Pool
const aiReporters = [
  { name: 'Alexandra Rivers', title: 'Senior Entertainment Reporter', location: 'New York Bureau' },
  { name: 'Michael Chen', title: 'Technology Reporter', location: 'San Francisco Bureau' },
  { name: 'Sarah Williams', title: 'Financial Correspondent', location: 'Wall Street Bureau' },
  { name: 'James Anderson', title: 'Political Analyst', location: 'Washington Bureau' },
  { name: 'Elena Rodriguez', title: 'Entertainment Correspondent', location: 'Los Angeles Bureau' }
];

// Function to transform external bylines to our AI reporters
const transformByline = (byline, section) => {
  let reporter;
  
  // Select appropriate reporter based on section
  switch(section?.toLowerCase()) {
    case 'entertainment':
      reporter = aiReporters.find(r => r.title.includes('Entertainment'));
      break;
    case 'technology':
      reporter = aiReporters.find(r => r.title.includes('Technology'));
      break;
    case 'business':
    case 'finance':
      reporter = aiReporters.find(r => r.title.includes('Financial'));
      break;
    case 'politics':
      reporter = aiReporters.find(r => r.title.includes('Political'));
      break;
    default:
      // Randomly select a reporter if section doesn't match
      reporter = aiReporters[Math.floor(Math.random() * aiReporters.length)];
  }

  return {
    byline: `By ${reporter.name}`,
    reporter: reporter
  };
};

// Get API key from environment variables
const API_KEY = process.env.REACT_APP_NYT_API_KEY || 'yourkey';
const BASE_URL = 'https://api.nytimes.com/svc/';

// Function to get articles using the NYT News API (v3) - frontend only, no database calls
export const getArticles = async (section = 'all', limit = 20) => {
  try {
    console.log(`Fetching articles for section: ${section}`);
    
    // Check session storage first
    const cachedKey = `category_${section}`;
    const cached = sessionStorage.getItem(cachedKey);
    if (cached) {
      const cachedArticles = JSON.parse(cached);
      if (cachedArticles.length > 0) {
        console.log(`Found ${cachedArticles.length} cached articles for section: ${section}`);
        return cachedArticles;
      }
    }
    
    // Fetch from API
    const response = await fetch(
      `${BASE_URL}news/v3/content/all/${section}.json?api-key=${API_KEY}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process articles
    const articlesWithImages = data.results.map(article => {
      const reporterInfo = transformByline(article.byline, article.section);
      
      const processedArticle = {
        id: article.slug_name || article.uri,
        title: article.title,
        abstract: article.abstract,
        byline: reporterInfo.byline,
        reporter: reporterInfo.reporter,
        published_date: article.published_date,
        updated_date: article.updated_date,
        section: article.section,
        url: article.url,
        keywords: article.des_facet || []
      };
      
      // Handle multimedia
      if (article.multimedia && article.multimedia.length > 0) {
        processedArticle.multimedia = article.multimedia.map(media => {
          let imageUrl = media.url;
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://www.nytimes.com/${imageUrl}`;
          }
          
          return {
            url: imageUrl,
            format: media.format,
            height: media.height,
            width: media.width,
            caption: media.caption || '',
            type: media.type || ''
          };
        });
        
        const largeFormats = ["superJumbo", "threeByTwoLargeAt2X", "Large", "jumbo"];
        const highQualityImage = article.multimedia.find(m => 
          largeFormats.includes(m.format)
        );
        
        if (highQualityImage) {
          let imageUrl = highQualityImage.url;
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://www.nytimes.com/${imageUrl}`;
          }
          processedArticle.highQualityImageUrl = imageUrl;
        }
      } else {
        processedArticle.multimedia = [];
      }
      
      return processedArticle;
    });
    
    console.log(`Fetched ${articlesWithImages.length} articles`);
    
    // Cache results
    sessionStorage.setItem(cachedKey, JSON.stringify(articlesWithImages));
    
    return articlesWithImages;
  } catch (error) {
    console.error('Error fetching articles:', error);
    return {
      articles: [],
      error: `Failed to fetch ${section} stories. Please check your API key or try again later.`,
      isError: true
    };
  }
};
