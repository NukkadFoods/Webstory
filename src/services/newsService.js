import { mockArticles } from './mockData';

// Get backend URL from environment variables
const BASE_URL = process.env.REACT_APP_API_URL;

export const getTopStories = async (section = 'home') => {
  try {
    console.log(`Fetching top stories for section: ${section} from backend`);
    const response = await fetch(`${BASE_URL}/api/articles/section/${section}?t=${Date.now()}`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Received data from backend:', data);
    
    return data.articles || data.results || data;
  } catch (error) {
    console.error('Error fetching top stories from backend:', error);
    
    // Return empty array instead of mock data to ensure fresh data
    console.log('Returning empty array instead of fallback data');
    return [];
  }
};

// Function to search for articles using the backend API
export const searchArticles = async (query = 'news', page = 1, category = null) => {
  try {
    // Build the API URL with query parameters
    let apiUrl = `${BASE_URL}/api/articles/search?q=${encodeURIComponent(query)}&page=${page - 1}`;
    
    // Add category filter if provided
    if (category && category !== 'all') {
      apiUrl += `&category=${encodeURIComponent(category)}`;
    }
    
    // Use backend to search articles
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Return articles and total results
    return {
      articles: data.articles || data.results || [],
      totalResults: data.totalResults || data.articles?.length || 0,
    };
  } catch (error) {
    console.error('Error searching articles from backend:', error);
    
    // Fall back to mock data if API request fails
    return {
      articles: mockArticles.slice(0, 10),
      totalResults: mockArticles.length
    };
  }
};

export const getArticleById = async (id) => {
  try {
    // Try to find the article in the top stories first (which might be cached)
    let cachedTopStories = sessionStorage.getItem('topStories');
    if (cachedTopStories) {
      cachedTopStories = JSON.parse(cachedTopStories);
      const cachedArticle = cachedTopStories.find(article => {
        const articleUri = article.uri ? article.uri.split('/').pop() : null;
        return article.id === id || articleUri === decodeURIComponent(id) || article.url === id;
      });
      
      if (cachedArticle) {
        return {
          ...cachedArticle,
          content: generateFullContent(cachedArticle)
        };
      }
    }

    // Use backend to get article by ID
    const response = await fetch(`${BASE_URL}/api/articles/${encodeURIComponent(id)}`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const article = await response.json();
    
    // Return processed article data
    return {
      ...article.article || article,
      content: generateFullContent(article.article || article)
    };
  } catch (error) {
    console.error('Error fetching article by ID from backend:', error);
    
    // Fall back to mock data if API request fails
    const decodedId = decodeURIComponent(id);
    const mockArticle = mockArticles.find(article => {
      const articleUri = article.uri ? article.uri.split('/').pop() : null;
      return article.id === decodedId || articleUri === decodedId || article.title === decodedId;
    });
    
    if (mockArticle) {
      return {
        ...mockArticle,
        content: generateFullContent(mockArticle)
      };
    }
    
    return null;
  }
};

// Helper function to generate full article content from various fields
const generateFullContent = (article) => {
  let fullContent = '';
  
  // Lead paragraph (typically the most important part)
  if (article.lead_paragraph) {
    fullContent += `<p class="lead-paragraph font-semibold text-lg">${article.lead_paragraph}</p>`;
  }
  
  // Abstract (often a summary of the article)
  if (article.abstract && article.abstract !== article.lead_paragraph) {
    fullContent += `<p>${article.abstract}</p>`;
  }
  
  // Snippet (another form of summary sometimes provided)
  if (article.snippet && article.snippet !== article.abstract && article.snippet !== article.lead_paragraph) {
    fullContent += `<p>${article.snippet}</p>`;
  }
  
  // For mock data or direct article text
  if (article.content && typeof article.content === 'string') {
    fullContent += article.content;
  }
  
  // If we have paragraphs from the body
  if (article.paragraph && Array.isArray(article.paragraph)) {
    article.paragraph.forEach(para => {
      fullContent += `<p>${para}</p>`;
    });
  }
  
  // Add article URL if it exists
  if (article.url) {
    fullContent += `<p class="mt-6"><a href="${article.url}" target="_blank" rel="noopener noreferrer" class="text-blue-700 hover:underline font-medium">Read the full article on The New York Times website</a></p>`;
  }
  
  // Add keywords as tags
  if (article.keywords && article.keywords.length > 0) {
    fullContent += '<div class="article-tags mt-6 pt-4 border-t border-gray-200">';
    fullContent += '<h3 class="text-lg font-bold mb-2">Related Topics</h3>';
    fullContent += '<div class="flex flex-wrap gap-2">';
    article.keywords.forEach(keyword => {
      const value = typeof keyword === 'object' ? keyword.value : keyword;
      fullContent += `<span class="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">${value}</span>`;
    });
    fullContent += '</div></div>';
  }
  
  return fullContent;
};