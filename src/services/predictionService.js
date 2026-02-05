const CacheService = require('./cache/cacheService');
const { Groq } = require('groq-sdk');

class PredictionService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  async predictRelatedTopics(article) {
    try {
      const prompt = `Based on this article title and content, suggest 3 most likely related topics that users might be interested in reading next. Format as JSON array.

Title: ${article.title}
Content: ${article.abstract || ''}
Keywords: ${article.keywords?.join(', ') || ''}

Example format:
["AI Development", "Machine Learning", "Tech Industry"]`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        max_tokens: 200,
      });

      const predictions = JSON.parse(completion.choices[0]?.message?.content || '[]');
      return predictions;
    } catch (error) {
      console.error('Error predicting related topics:', error);
      return [];
    }
  }

  async preFetchRelatedContent(article) {
    try {
      const predictions = await this.predictRelatedTopics(article);
      
      // Store predictions in cache for quick access
      await CacheService.cacheSearchResults(
        `predictions:${article.id}`,
        predictions
      );

      // Pre-fetch and cache related content
      for (const topic of predictions) {
        const cacheKey = `search:${topic.toLowerCase()}`;
        const cached = await CacheService.getSearchResults(cacheKey);
        
        if (!cached) {
          // Trigger background fetch without awaiting
          this.backgroundFetch(topic);
        }
      }

      return predictions;
    } catch (error) {
      console.error('Error in content pre-fetching:', error);
      return [];
    }
  }

  async backgroundFetch(topic) {
    try {
      const isDev = process.env.NODE_ENV === 'development';
      const API_BASE_URL = isDev ? '' : (process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com');
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(topic)}`);
      const results = await response.json();
      
      if (results) {
        await CacheService.cacheSearchResults(
          `search:${topic.toLowerCase()}`,
          results,
          1800 // 30 minutes cache
        );
      }
    } catch (error) {
      console.error(`Background fetch error for ${topic}:`, error);
    }
  }
}

module.exports = new PredictionService();
