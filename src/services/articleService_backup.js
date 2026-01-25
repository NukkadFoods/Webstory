// Import MongoDB article service and Groq service
import { saveArticle, saveArticles, getArticlesBySection, searchArticles as dbSearchArticles, getAllArticles } from './db/articleService';
import { generateArticleCommentary, batchGenerateCommentary } from './groqService';

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
const API_KEY = process.env.REACT_APP_NYT_API_KEY || 'yourkey'; // Replace 'yourkey' with your actual API key in .env file
const BASE_URL = 'https://api.nytimes.com/svc/';

// Function to get articles using the NYT News API (v3)
export const getArticles = async (section = 'all', limit = 20) => {
  try {
    console.log(`Fetching articles for section: ${section}`);
    
    // First try to get articles from MongoDB
    try {
      console.log(`Checking MongoDB for articles in section: ${section}`);
      const dbArticles = await getArticlesBySection(section, limit);
      
      if (dbArticles && dbArticles.length > 0) {
        console.log(`Found ${dbArticles.length} articles in MongoDB for section: ${section}`);
        return dbArticles;
      }
    } catch (dbError) {
      console.error('Error fetching articles from MongoDB:', dbError);
      // Continue with API fetch if MongoDB fails
    }
    
    // If no articles in MongoDB, fetch from API
    const response = await fetch(
      `${BASE_URL}news/v3/content/all/${section}.json?api-key=${API_KEY}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process and enhance articles with better image handling
    const articlesWithImages = data.results.map(article => {
      // Create a base article object with standard fields
      // Transform byline to use AI reporter
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
      
      // Handle multimedia content with special attention to image quality
      if (article.multimedia && article.multimedia.length > 0) {
        // Extract and enhance multimedia data
        processedArticle.multimedia = article.multimedia.map(media => {
          // For News API v3, sometimes the image URLs are relative, ensure they're absolute
          let imageUrl = media.url;
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://www.nytimes.com/${imageUrl}`;
          }
          
          // Handle NYT's specific "superJumbo" URLs for higher quality images
          if (media.format === "superJumbo" || media.format === "Large") {
            console.log("Found superJumbo format image:", imageUrl);
          }
          
          // Return enhanced media object
          return {
            url: imageUrl,
            format: media.format,
            height: media.height,
            width: media.width,
            caption: media.caption || '',
            type: media.type || ''
          };
        });
        
        // Add a direct high-quality image property
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
    
    // Save articles to MongoDB in the background
    saveArticles(articlesWithImages)
      .then(savedArticles => {
        console.log(`Saved ${savedArticles.length} articles to MongoDB`);
      })
      .catch(error => {
        console.error('Error saving articles to MongoDB:', error);
      });
    
    // Cache the results in session storage for later use
    sessionStorage.setItem(`category_${section}`, JSON.stringify(articlesWithImages));
    
    return articlesWithImages;
  } catch (error) {
    console.error('Error fetching articles:', error);
    // Instead of using mock data, return an empty array with an error property
    return {
      articles: [],
      error: `Failed to fetch ${section} stories. Please check your API key or try again later.`,
      isError: true
    };
  }
};

// Function to search for articles using the NYT Article Search API
export const searchArticles = async (query = 'news', page = 1, category = null) => {
  try {
    console.log(`Searching for articles with query: "${query}", page: ${page}, category: ${category || 'all'}`);
    
    // First try to get articles from MongoDB
    try {
      console.log(`Checking MongoDB for articles matching: ${query}`);
      const dbArticles = await dbSearchArticles(query, 20); // Fetch up to 20 articles
      
      if (dbArticles && dbArticles.length > 0) {
        console.log(`Found ${dbArticles.length} articles in MongoDB for query: ${query}`);
        return {
          articles: dbArticles,
          totalResults: dbArticles.length,
          fromDatabase: true
        };
      }
    } catch (dbError) {
      console.error('Error searching articles from MongoDB:', dbError);
      // Continue with API fetch if MongoDB fails
    }
    
    // Enhance search for common entities with related terms
    let enhancedQuery = query;
    const queryLower = query.toLowerCase();
    
    // Map of common search terms to enhanced search queries
    const searchEnhancements = {
      'google': 'google OR "alphabet inc" OR "tech company"',
      'apple': 'apple OR "iphone maker" OR "tech company"',
      'microsoft': 'microsoft OR "tech giant" OR "windows"',
      'amazon': 'amazon OR "e-commerce" OR "bezos"',
      'facebook': 'facebook OR "meta" OR "social media"',
      'twitter': 'twitter OR "x platform" OR "social media"',
      'tesla': 'tesla OR "electric vehicles" OR "musk"',
      'ai': 'ai OR "artificial intelligence" OR "machine learning"',
      'crypto': 'crypto OR "cryptocurrency" OR "bitcoin"',
      'elon': 'elon OR "elon musk" OR "musk" OR "tesla ceo"',
    };
    
    // Check if the query is a common entity that needs enhancement
    if (searchEnhancements[queryLower]) {
      enhancedQuery = searchEnhancements[queryLower];
      console.log(`Enhanced search query from "${query}" to "${enhancedQuery}"`);
    }
    
    // Special case: if the query matches an exact category name, also check that category's data
    const knownCategories = ['politics', 'business', 'technology', 'science', 'health', 'finance', 'arts', 'sports', 'world', 'us'];
    
    // Also check for partial matches like "tech" for "technology"
    const categoryMatch = knownCategories.find(cat => 
      cat === queryLower || cat.startsWith(queryLower) || queryLower.startsWith(cat)
    );
    
    if (categoryMatch && page === 1) {
      // If the query is a category name, try to load that category directly first
      try {
        console.log(`Query "${query}" matches category "${categoryMatch}", fetching from category API`);
        const { getTopStories } = await import('./storyService');
        const categoryArticles = await getTopStories(categoryMatch);
        
        if (categoryArticles && Array.isArray(categoryArticles) && categoryArticles.length > 0) {
          console.log(`Found ${categoryArticles.length} articles from ${categoryMatch} category`);
          
          // Save to MongoDB in the background
          saveArticles(categoryArticles)
            .then(savedArticles => {
              console.log(`Saved ${savedArticles.length} articles to MongoDB`);
            })
            .catch(error => {
              console.error('Error saving category articles to MongoDB:', error);
            });
          
          return {
            articles: categoryArticles,
            totalResults: categoryArticles.length,
            fromCategory: true
          };
        }
      } catch (categoryError) {
        console.error(`Error fetching ${categoryMatch} category:`, categoryError);
        // Continue with normal search if category fetch fails
      }
    }
    
    // Proceed with normal article search API
    // Article Search API provides the most comprehensive search across all article content
    let apiUrl = `${BASE_URL}search/v2/articlesearch.json?q=${encodeURIComponent(enhancedQuery)}&page=${page - 1}&api-key=${API_KEY}`;
    
    // Optional search refinements that can improve result relevance
    apiUrl += '&sort=newest'; // Get newest articles first
    
    // Add field limiting to optimize response size
    apiUrl += '&fl=_id,web_url,headline,abstract,lead_paragraph,pub_date,multimedia,keywords,byline,section_name,snippet';
    
    // Add category filter if provided
    if (category && category !== 'all') {
      apiUrl += `&fq=section_name:${encodeURIComponent(category)}`;
    }
    
    console.log('Fetching from Article Search API: ', apiUrl);
    
    // Use the NYT Article Search API to get search results
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`API Error: ${response.status} - ${response.statusText}`);
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      console.error('Invalid API response:', data);
      throw new Error('Invalid response from API');
    }

    console.log(`Found ${data.response.docs?.length || 0} articles for query "${query}" (of approximately ${data.response.meta?.hits || 0} total results)`);

    // Process and return articles
    const articles = data.response.docs.map(doc => ({
      id: doc._id,
      title: doc.headline?.main || 'Untitled Article',
      abstract: doc.abstract || doc.snippet || doc.lead_paragraph || '',
      lead_paragraph: doc.lead_paragraph || '',
      byline: doc.byline?.original || '',
      published_date: doc.pub_date,
      updated_date: doc.updated_date,
      section: doc.section_name || 'General',
      url: doc.web_url,
      multimedia: doc.multimedia
        ? doc.multimedia.map(media => ({
            url: `https://www.nytimes.com/${media.url}`,
            type: media.type,
            caption: media.caption,
            height: media.height,
            width: media.width
          }))
        : [],
      keywords: doc.keywords?.map(k => k.value) || [],
      // Include snippet which often shows matching search terms
      snippet: doc.snippet || ''
    }));
    
    // Save search results to MongoDB in the background
    saveArticles(articles)
      .then(savedArticles => {
        console.log(`Saved ${savedArticles.length} search result articles to MongoDB`);
      })
      .catch(error => {
        console.error('Error saving search result articles to MongoDB:', error);
      });
    
    // Cache search results in session storage
    sessionStorage.setItem(`search_${query}`, JSON.stringify(articles));

    return {
      articles,
      totalResults: data.response.meta.hits || articles.length,
      currentPage: page,
      // Include extra search metadata
      searchInfo: {
        query: query,
        enhancedQuery: enhancedQuery !== query ? enhancedQuery : undefined,
        category: category
      }
    };
  } catch (error) {
    console.error('Error searching articles:', error);
    
    // For trending topics, try to find relevant articles from cached content
    try {
      console.log('Trying to find relevant articles from cached content...');
      let allCachedArticles = [];
      
      // Get articles from top stories cache
      const cachedTopStories = JSON.parse(sessionStorage.getItem('topStories') || '[]');
      if (cachedTopStories.length > 0) {
        allCachedArticles = [...allCachedArticles, ...cachedTopStories];
      }
      
      // Try to get any category-specific cached articles
      const categories = ['politics', 'business', 'technology', 'science', 'health', 'finance', 'arts', 'sports', 'world', 'us'];
      categories.forEach(cat => {
        try {
          const catArticles = JSON.parse(sessionStorage.getItem(`category_${cat}`) || '[]');
          if (catArticles.length > 0) {
            allCachedArticles = [...allCachedArticles, ...catArticles];
          }
        } catch (e) {
          console.error(`Error accessing cached ${cat} articles:`, e);
        }
      });
      
      // Add Entertainment articles to search scope
      try {
        const entertainmentArticles = JSON.parse(sessionStorage.getItem('entertainment_articles') || '[]');
        if (entertainmentArticles.length > 0) {
          console.log(`Including ${entertainmentArticles.length} entertainment articles in search scope`);
          allCachedArticles = [...allCachedArticles, ...entertainmentArticles];
        }
      } catch (e) {
        console.error('Error accessing cached entertainment articles:', e);
      }
      
      // Add Finance articles to search scope
      try {
        const financeArticles = JSON.parse(sessionStorage.getItem('finance_articles') || '[]');
        if (financeArticles.length > 0) {
          console.log(`Including ${financeArticles.length} finance articles in search scope`);
          allCachedArticles = [...allCachedArticles, ...financeArticles];
        }
      } catch (e) {
        console.error('Error accessing cached finance articles:', e);
      }
      
      // Add Wall Street articles to search scope
      try {
        const wallStreetArticles = JSON.parse(sessionStorage.getItem('wallstreet_articles') || '[]');
        if (wallStreetArticles.length > 0) {
          console.log(`Including ${wallStreetArticles.length} Wall Street articles in search scope`);
          allCachedArticles = [...allCachedArticles, ...wallStreetArticles];
        }
      } catch (e) {
        console.error('Error accessing cached Wall Street articles:', e);
      }
      
      if (allCachedArticles.length > 0) {
        console.log(`Found ${allCachedArticles.length} cached articles to search through`);
        
        // Remove duplicates by URI or ID
        const uniqueArticles = [];
        const seenIds = new Set();
        
        allCachedArticles.forEach(article => {
          const id = article.uri || article.id || article.url;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            uniqueArticles.push(article);
          }
        });
        
        // 1. First try exact matches
        const queryLower = query.toLowerCase();
        
        // Prepare enhanced terms for specific entities
        const enhancedSearchTerms = [];
        if (queryLower === 'google') {
          enhancedSearchTerms.push('alphabet', 'tech', 'android', 'search engine');
        } else if (queryLower === 'apple') {
          enhancedSearchTerms.push('iphone', 'mac', 'ios', 'tech');
        } else if (queryLower === 'tech' || queryLower === 'technology') {
          enhancedSearchTerms.push('digital', 'software', 'hardware', 'internet');
        }
        
        // Filter articles that match the query or enhanced terms
        const filteredArticles = uniqueArticles.filter(article => {
          const searchableText = [
            article.title || '', 
            article.abstract || '', 
            article.section || '', 
            ...(article.des_facet || []),
            ...(article.keywords?.map(k => typeof k === 'string' ? k : k.value) || [])
          ].join(' ').toLowerCase();
          
          // Check if any of our search terms are in the text
          if (searchableText.includes(queryLower)) {
            return true;
          }
          
          // If this is a known entity search, try the enhanced terms too
          return enhancedSearchTerms.some(term => searchableText.includes(term));
        });
        
        console.log(`Found ${filteredArticles.length} articles matching query "${query}" from cache`);
        
        if (filteredArticles.length > 0) {
          return {
            articles: filteredArticles.slice(0, 10), // Limit to 10 results as the API would
            totalResults: filteredArticles.length,
            fromCache: true
          };
        }
        
        // 2. If no exact matches, try looking for related content in Business and Technology sections
        if (queryLower === 'google' || queryLower === 'apple' || queryLower === 'microsoft' || 
            queryLower === 'amazon' || queryLower === 'facebook' || queryLower === 'tesla') {
          
          // For tech companies, show tech and business news if no direct matches
          const techBusinessArticles = uniqueArticles.filter(article => {
            const section = article.section?.toLowerCase() || '';
            return section === 'technology' || section === 'business' || section === 'tech';
          });
          
          if (techBusinessArticles.length > 0) {
            console.log(`No direct matches for "${query}", showing ${Math.min(10, techBusinessArticles.length)} tech/business articles instead`);
            return {
              articles: techBusinessArticles.slice(0, 10),
              totalResults: techBusinessArticles.length,
              fromCache: true,
              isRelated: true
            };
          }
        }
      }
    } catch (cacheError) {
      console.error('Error searching cached articles:', cacheError);
    }
    
    // Return empty results with error information instead of using mock data
    return {
      articles: [],
      totalResults: 0,
      error: `No results found for "${query}". Please try another search term or check your API key.`,
      isError: true
    };
  }
};

// Function to get a specific article by ID
export const getArticleById = async (id) => {
  try {
    console.log('Fetching article by ID:', id);
    
    // Try to find the article in cached articles from News API
    let cachedArticles = sessionStorage.getItem('articles');
    if (cachedArticles) {
      cachedArticles = JSON.parse(cachedArticles);
      
      console.log('Checking through', cachedArticles.length, 'cached articles from News API');
      
      const cachedArticle = cachedArticles.find(article => {
        // Handle different ID formats
        const articleId = article.id || '';
        const articleUri = article.uri ? article.uri.split('/').pop() : '';
        const articleUrl = article.url || '';
        const articleTitle = article.title || '';
        
        const decodedInputId = decodeURIComponent(id);
        
        // Check various ways the article might be identified
        return articleId === decodedInputId || 
               articleId === id || 
               articleUri === decodedInputId || 
               articleUrl === decodedInputId || 
               articleTitle === decodedInputId;
      });
      
      if (cachedArticle) {
        console.log('Found article in News API cache:', cachedArticle.title);
        return {
          ...cachedArticle,
          content: generateFullContent(cachedArticle)
        };
      }
    }
    
    // Check top stories cache too
    let cachedTopStories = sessionStorage.getItem('topStories');
    if (cachedTopStories) {
      cachedTopStories = JSON.parse(cachedTopStories);
      
      console.log('Checking through', cachedTopStories.length, 'cached top stories');
      
      const cachedStory = cachedTopStories.find(story => {
        // Handle different ID formats
        const storyId = story.id || '';
        const storyUri = story.uri ? story.uri.split('/').pop() : '';
        const storyUrl = story.url || '';
        const storyTitle = story.title || '';
        
        const decodedInputId = decodeURIComponent(id);
        
        // Check various ways the story might be identified
        return storyId === decodedInputId || 
               storyId === id || 
               storyUri === decodedInputId || 
               storyUrl === decodedInputId || 
               storyTitle === decodedInputId;
      });
      
      if (cachedStory) {
        console.log('Found article in top stories cache:', cachedStory.title);
        return {
          ...cachedStory,
          content: generateFullContent(cachedStory)
        };
      }
    }

    // Check Entertainment articles cache
    let cachedEntertainmentArticles = sessionStorage.getItem('entertainment_articles');
    if (cachedEntertainmentArticles) {
      cachedEntertainmentArticles = JSON.parse(cachedEntertainmentArticles);
      
      console.log('Checking through', cachedEntertainmentArticles.length, 'cached entertainment articles');
      
      const cachedArticle = cachedEntertainmentArticles.find(article => {
        const articleId = article.id || '';
        const articleUrl = article.url || '';
        const articleTitle = article.title || '';
        const decodedInputId = decodeURIComponent(id);
        
        return articleId === decodedInputId || 
               articleId === id || 
               articleUrl === decodedInputId ||
               articleTitle === decodedInputId;
      });
      
      if (cachedArticle) {
        console.log('Found article in entertainment cache:', cachedArticle.title);
        return {
          ...cachedArticle,
          content: generateFullContent(cachedArticle)
        };
      }
    }
    
    // Check Wall Street articles cache
    let cachedWallStreetArticles = sessionStorage.getItem('wallstreet_articles');
    if (cachedWallStreetArticles) {
      cachedWallStreetArticles = JSON.parse(cachedWallStreetArticles);
      
      console.log('Checking through', cachedWallStreetArticles.length, 'cached Wall Street articles');
      
      const cachedArticle = cachedWallStreetArticles.find(article => {
        const articleId = article.id || '';
        const articleUrl = article.url || '';
        const articleTitle = article.title || '';
        const decodedInputId = decodeURIComponent(id);
        
        return articleId === decodedInputId || 
               articleId === id || 
               articleUrl === decodedInputId ||
               articleTitle === decodedInputId;
      });
      
      if (cachedArticle) {
        console.log('Found article in Wall Street cache:', cachedArticle.title);
        return {
          ...cachedArticle,
          content: generateFullContent(cachedArticle)
        };
      }
    }

    // For NYT API: article search with web_url or title if it's not a direct ID
    let searchParam = '';
    let apiUrl = '';
    
    // First, try to decode the ID if it's URI encoded
    const decodedId = decodeURIComponent(id);
    
    if (decodedId.includes('nyt://') || decodedId.startsWith('http')) {
      // It's a URL or URI - try to match by web_url
      searchParam = `web_url:"${decodedId}"`;
    } else if (decodedId.startsWith('nyt') || /^[a-zA-Z0-9]{24,}$/.test(decodedId)) {
      // Likely a NYT article ID
      searchParam = `_id:"${decodedId}"`;
    } else {
      // Try using it as a headline search as a last resort
      searchParam = `headline:"${decodedId}"`;
    }
    
    apiUrl = `${BASE_URL}search/v2/articlesearch.json?fq=${encodeURIComponent(searchParam)}&api-key=${API_KEY}`;
    
    console.log('Fetching from NYT Search API with URL:', apiUrl);
    
    // Try to fetch the article from the search API
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.response || data.response.docs.length === 0) {
      console.log('No results found in search API for ID:', id);
      throw new Error('Article not found');
    }
    
    const doc = data.response.docs[0];
    console.log('Found article in search API:', doc.headline.main);
    
    // Return processed article data with content
    return {
      id: doc._id,
      title: doc.headline.main,
      abstract: doc.abstract || doc.snippet,
      lead_paragraph: doc.lead_paragraph,
      ...transformByline(doc.byline?.original, doc.section_name),
      published_date: doc.pub_date,
      section: doc.section_name || 'General',
      url: doc.web_url,
      content: generateFullContent(doc),
      multimedia: doc.multimedia?.map(media => ({
        url: `https://www.nytimes.com/${media.url}`,
        type: media.type,
        caption: media.caption
      })) || []
    };
  } catch (error) {
    console.error('Error fetching article by ID:', id, error);
    
    // Return an error object instead of using mock data
    return {
      error: 'Article not found. The content may no longer be available.',
      isError: true,
      id: id
    };
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