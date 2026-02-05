// Frontend-specific article service that uses API calls
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = (isDevelopment ? '' : (process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com')) + '/api';

/**
 * Get articles by section
 * @param {string} section - Section name
 * @param {number} limit - Maximum number of articles to return
 * @returns {Promise<Array<Object>>} Articles in the section
 */
const getArticlesBySection = async (section, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/articles/section/${section}?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error(`Error getting articles for section ${section}:`, error);
    return [];
  }
};

/**
 * Search articles by keyword
 * @param {string} keyword - Keyword to search for
 * @param {number} limit - Maximum number of articles to return
 * @returns {Promise<Object>} Search results with articles array
 */
const searchArticles = async (keyword, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/articles/search?q=${encodeURIComponent(keyword)}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return {
      articles: data.articles || [],
      totalResults: data.totalResults || data.count || (data.articles ? data.articles.length : 0)
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
 * Get all articles
 * @param {number} limit - Maximum number of articles to return
 * @returns {Promise<Array<Object>>} All articles
 */
const getAllArticles = async (limit = 100) => {
  try {
    const response = await fetch(`${API_BASE_URL}/articles?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('Error getting all articles:', error);
    return [];
  }
};

/**
 * Get article by ID
 * @param {string} id - Article ID
 * @returns {Promise<Object|null>} Article object or null if not found
 */
const getArticleById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/articles/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.article || null;
  } catch (error) {
    console.error(`Error getting article with ID ${id}:`, error);
    return null;
  }
};

export {
  getArticlesBySection,
  searchArticles,
  getAllArticles,
  getArticleById
};
