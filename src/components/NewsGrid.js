import React from 'react';
import NewsCard from './NewsCard';
import useArticleCommentary from '../hooks/useArticleCommentary';

const NewsGrid = ({ articles: initialArticles, loading: initialLoading, error }) => {
  console.log('NewsGrid received articles:', initialArticles?.length || 'undefined');
  
  // Don't process articles through commentary hook if we don't have any yet
  const shouldProcessCommentary = initialArticles && initialArticles.length > 0;
  const { articles: processedArticles, loading: commentaryLoading } = useArticleCommentary(shouldProcessCommentary ? initialArticles : null);
  
  // Use processed articles if available and not empty, otherwise fall back to initial articles
  const articles = (processedArticles && processedArticles.length > 0) ? processedArticles : (initialArticles || []);
  
  console.log('NewsGrid processed articles:', articles?.length || 'undefined');
  
  // Show loading if initially loading OR if we have articles but commentary is loading and no processed articles yet
  const loading = initialLoading || (shouldProcessCommentary && commentaryLoading && (!processedArticles || processedArticles.length === 0));
  
  if (loading) {
    return (
      <div className="flex justify-center my-12">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
        <p>{error}</p>
      </div>
    );
  }

  // Use the processed articles if available, otherwise fall back to initial articles
  const displayArticles = articles && articles.length > 0 ? articles : initialArticles;

  if (!displayArticles || displayArticles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No articles found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
      {displayArticles.map((article, index) => (
        <NewsCard
          key={article.uri || article.id || article.title || index}
          article={article}
        />
      ))}
    </div>
  );
};

export default NewsGrid;