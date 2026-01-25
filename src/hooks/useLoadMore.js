import { useState, useEffect } from 'react';

const useLoadMore = (articles, initialCount = 4) => {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  // Reset visible count when articles change
  useEffect(() => {
    setVisibleCount(initialCount);
  }, [articles, initialCount]);

  const hasMore = articles.length > visibleCount;
  const visibleArticles = articles.slice(0, visibleCount);

  const loadMore = async () => {
    setLoading(true);
    try {
      // Add 4 more articles to visible count
      setVisibleCount(prev => Math.min(prev + 4, articles.length));
    } finally {
      setLoading(false);
    }
  };

  return {
    visibleArticles,
    hasMore,
    loading,
    loadMore
  };
};

export default useLoadMore;
