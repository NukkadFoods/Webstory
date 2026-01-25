import { useState, useEffect, useRef } from 'react';
import { makeAPIRequest } from '../services/apiConfig';

const useArticleCommentary = (articles) => {
  const [articlesWithCommentary, setArticlesWithCommentary] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastProcessedArticles = useRef(null);

  const generateCommentaryForArticles = async (articlesToProcess) => {
    setLoading(true);
    try {
      const processedArticles = await Promise.all(
        articlesToProcess.map(async (article) => {
          // Skip if article already has commentary
          if (article.aiCommentary) {
            return article;
          }

          try {
            const response = await makeAPIRequest('/api/generate-commentary', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: article.title,
                content: article.abstract || article.summary || article.content || 'No content available',
                category: article.section || article.category
              }),
            });

            if (!response.ok) {
              // Get error details
              const errorData = await response.json().catch(() => ({}));
              console.error('❌ Commentary API error:', {
                status: response.status,
                article: article.title,
                error: errorData.error,
                message: errorData.message
              });
              
              return {
                ...article,
                aiCommentary: null,
                commentaryError: errorData.message || 'Failed to generate commentary'
              };
            }

            const data = await response.json();
            return {
              ...article,
              aiCommentary: data.commentary
            };
          } catch (error) {
            console.error('❌ Error generating commentary for article:', {
              title: article.title.substring(0, 50),
              error: error.message
            });
            return {
              ...article,
              aiCommentary: null,
              commentaryError: 'Commentary service unavailable'
            };
          }
        })
      );

      setArticlesWithCommentary(processedArticles);
    } catch (error) {
      console.error('Error processing articles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useArticleCommentary: articles changed:', articles?.length || 0);
    
    // Only process if we have actual articles and they're different from last processed
    if (articles && articles.length > 0) {
      // Check if articles have actually changed (to avoid re-processing same articles)
      const articlesString = JSON.stringify(articles.map(a => a.id || a.uri || a.title));
      
      if (lastProcessedArticles.current !== articlesString) {
        lastProcessedArticles.current = articlesString;
        
        // Immediately set the articles so they display while commentary is being generated
        setArticlesWithCommentary(articles);
        
        // Filter out articles that already have commentary
        const articlesNeedingCommentary = articles.filter(article => !article.aiCommentary);
        if (articlesNeedingCommentary.length > 0) {
          // Generate commentary in background, but don't block display
          generateCommentaryForArticles(articles);
        }
      }
    } else if (articles && articles.length === 0) {
      // Only set to empty if we explicitly received an empty array
      setArticlesWithCommentary([]);
      lastProcessedArticles.current = null;
    }
    // Don't update if articles is undefined/null (initial state)
  }, [articles]);

  return { articles: articlesWithCommentary, loading };
};

export default useArticleCommentary;
