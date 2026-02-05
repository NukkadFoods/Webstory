// Use our backend API instead of hitting NYT directly
const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment ? '' : (process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com');

export const getTopStories = async (section = 'home') => {
  const cacheKey = `topStories_${section}`;
  const timestampKey = `${cacheKey}_timestamp`;
  
  // Helper function for retry logic
  const retryFetch = async (url, options, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}: Fetching ${url}`);
        const response = await fetch(url, {
          ...options,
          timeout: 8000,
        });
        
        if (response.ok) {
          return response;
        } else if (response.status >= 500 && attempt < maxRetries) {
          console.warn(`⚠️ Server error ${response.status}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5;
          continue;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        if (attempt === maxRetries) throw error;
        console.warn(`⚠️ Network error on attempt ${attempt}, retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
  };
  
  try {
    // Check for fresh cached data first (< 3 minutes)
    const cachedData = sessionStorage.getItem(cacheKey);
    const cacheTimestamp = sessionStorage.getItem(timestampKey);
    
    if (cachedData && cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      if (cacheAge < 180000) { // Less than 3 minutes old
        console.log(`✅ Using fresh cached stories for ${section} (${Math.round(cacheAge/1000)}s old)`);
        try {
          return JSON.parse(cachedData);
        } catch (parseError) {
          console.warn('Cache parse error, fetching fresh data:', parseError);
        }
      }
    }
    
    // Try fetching with retry logic
    console.log(`🌐 Fetching fresh articles from backend for ${section}...`);
    const response = await retryFetch(`${API_BASE_URL}/api/articles?category=${section}&limit=20`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log(`✅ Received ${data.length || 0} articles from backend`);
    
    const articles = Array.isArray(data) ? data : (data.articles || []);
    
    // Cache successful results with timestamp
    if (articles.length > 0) {
      sessionStorage.setItem(cacheKey, JSON.stringify(articles));
      sessionStorage.setItem(timestampKey, Date.now().toString());
    }
    
    return articles;
    
  } catch (error) {
    console.error('❌ Error fetching top stories:', error);
    
    // Try to return any cached data (even if old) as fallback
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      console.log('🔄 Using fallback cached data due to fetch error');
      try {
        return JSON.parse(cachedData);
      } catch (parseError) {
        console.error('Error parsing cached data:', parseError);
      }
    }
    
    // Final fallback: return sample stories instead of empty array
    console.log('🔄 Using fallback sample stories');
    return getFallbackStories(section);
  }
};

// Fallback stories when backend is unavailable
const getFallbackStories = (section) => {
  return [
    {
      id: `fallback-story-${section}-1`,
      title: "News Service Updating - Please Refresh",
      abstract: "We're updating our news service with the latest stories. Please refresh the page to try again.",
      url: window.location.href,
      published_date: new Date().toISOString(),
      section: section,
      multimedia: [],
      byline: "Editorial Team",
      source: "System Notice"
    },
    {
      id: `fallback-story-${section}-2`,
      title: "Latest Updates Loading Soon", 
      abstract: "Our team is working to bring you the latest news updates. Thank you for your patience.",
      url: window.location.href,
      published_date: new Date().toISOString(),
      section: section,
      multimedia: [],
      byline: "News Team",
      source: "System Notice"
    }
  ];
};

export const fetchFullStoryContent = async (storyUrl) => {
  // Implementation similar to fetchFullArticleContent in newsService
  try {
    // For now, we'll return a basic message since we can't easily scrape full story content
    return `
      <p class="mb-6">This story is available from the New York Times. Unfortunately, we can only display a preview here.</p>
      <p class="mb-6">Please click the link below to read the full story:</p>
      <p class="my-6">
        <a href="${storyUrl}" target="_blank" rel="noopener noreferrer" class="bg-blue-700 hover:bg-blue-800 text-white py-2 px-6 rounded-md inline-flex items-center">
          Read Full Story on NYT Website
        </a>
      </p>
    `;
  } catch (error) {
    console.error('Error fetching full story content:', error);
    return `
      <p class="mb-6">We encountered an issue retrieving the full story content.</p>
      <p class="mb-6">Please click the link below to read the full story on the New York Times website:</p>
      <p class="my-6">
        <a href="${storyUrl}" target="_blank" rel="noopener noreferrer" class="bg-blue-700 hover:bg-blue-800 text-white py-2 px-6 rounded-md inline-flex items-center">
          Read Full Story on NYT Website
        </a>
      </p>
    `;
  }
};