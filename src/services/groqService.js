const isDevelopment = process.env.NODE_ENV === 'development';
const API_URL = isDevelopment ? '' : (process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com');

/**
 * Generates expert commentary for a news article
 * @param {Object} article - The article object containing title, content, and category
 * @returns {Promise<string>} - AI-generated expert commentary
 */
export const generateArticleCommentary = async (article) => {
  try {
    const prompt = `As an expert analyst, provide a brief but insightful commentary (2-3 paragraphs) on the following ${article.category} news:
    
    Title: ${article.title}
    Content: ${article.content}
    
    Focus on:
    1. Key implications and potential impacts
    2. Expert analysis of the situation
    3. Historical context or similar cases if relevant
    4. Potential future developments
    
    Keep the tone professional and analytical.`;

    const response = await fetch(`${API_URL}/api/generate-commentary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        category: article.category
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Commentary generation failed:', {
        status: response.status,
        error: errorData.error,
        message: errorData.message
      });
      throw new Error(errorData.message || 'Failed to generate commentary');
    }

    const data = await response.json();

    return data.commentary;
  } catch (error) {
    console.error('Error generating article commentary:', error);
    return 'Unable to generate commentary at this time';
  }
};

/**
 * Enhances multiple articles with AI commentary in batch
 * @param {Array} articles - Array of article objects
 * @returns {Promise<Array>} - Articles enhanced with AI commentary
 */
export const batchGenerateCommentary = async (articles) => {
  try {
    const enhancedArticles = await Promise.all(
      articles.map(async (article) => {
        if (!article.aiCommentary) {  // Only generate if not already present
          const commentary = await generateArticleCommentary(article);
          return { ...article, aiCommentary: commentary };
        }
        return article;
      })
    );
    return enhancedArticles;
  } catch (error) {
    console.error('Error in batch commentary generation:', error);
    return articles;  // Return original articles if enhancement fails
  }
};
