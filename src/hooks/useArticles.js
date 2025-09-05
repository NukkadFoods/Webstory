import useSWR from 'swr';

// API Configuration
import { mutate } from 'swr';

// Use environment variable for API base URL
const API_BASE = process.env.REACT_APP_API_URL + '/api';

// Enhanced fetcher with error handling and caching headers
const fetcher = async (url) => {
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'public, max-age=300', // 5 minutes client cache
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = new Error('Failed to fetch');
    error.status = response.status;
    error.info = await response.json().catch(() => ({}));
    throw error;
  }
  
  return response.json();
};

// SWR Configuration with optimized caching
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // 1 minute deduping
  errorRetryInterval: 5000,
  errorRetryCount: 3,
  refreshInterval: 300000, // 5 minutes auto-refresh for homepage
};

// Custom Hooks for Different Data Types

export const useArticles = (limit = 20) => {
  const { data, error, mutate } = useSWR(
    `${API_BASE}/articles?limit=${limit}`,
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 300000, // 5 minutes for homepage
    }
  );

  return {
    articles: data || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
};

export const useArticlesBySection = (section, limit = 10, withAI = false) => {
  const aiParam = withAI ? '&ai=true' : '';
  const { data, error, mutate } = useSWR(
    section ? `${API_BASE}/articles/section/${section}?limit=${limit}${aiParam}` : null,
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 900000, // 15 minutes for categories
    }
  );

  return {
    articles: data || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
};

export const useSearchArticles = (query, limit = 10) => {
  const { data, error, mutate } = useSWR(
    query ? `${API_BASE}/articles/search?q=${encodeURIComponent(query)}&limit=${limit}` : null,
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 600000, // 10 minutes for search
      dedupingInterval: 30000, // More aggressive deduping for search
    }
  );

  return {
    articles: data || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
};

export const useArticle = (id, withAI = false) => {
  const aiParam = withAI ? '?ai=true' : '';
  const { data, error, mutate } = useSWR(
    id ? `${API_BASE}/articles/${id}${aiParam}` : null,
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 1800000, // 30 minutes for individual articles
    }
  );

  return {
    article: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
};

// Cache Management Utilities
export const useCacheStats = () => {
  const { data, error } = useSWR(
    `${API_BASE}/articles/cache/stats`,
    fetcher,
    {
      refreshInterval: 30000, // 30 seconds for monitoring
      revalidateOnFocus: true,
    }
  );

  return {
    stats: data,
    isLoading: !error && !data,
    isError: error,
  };
};

// Preloading utilities for better UX
export const preloadArticlesBySection = (section, limit = 10) => {
  return mutate(
    `${API_BASE}/articles/section/${section}?limit=${limit}`,
    fetcher(`${API_BASE}/articles/section/${section}?limit=${limit}`),
    false
  );
};

export const preloadArticle = (id) => {
  return mutate(
    `${API_BASE}/articles/${id}`,
    fetcher(`${API_BASE}/articles/${id}`),
    false
  );
};

// Global cache utilities
export const invalidateAllArticles = () => {
  // Invalidate all article-related cache keys
  mutate(
    key => typeof key === 'string' && key.includes('/articles'),
    undefined,
    true
  );
};

export const invalidateSection = (section) => {
  mutate(
    key => typeof key === 'string' && key.includes(`/section/${section}`),
    undefined,
    true
  );
};

// Error boundary for SWR errors
export const handleSWRError = (error) => {
  console.error('SWR Error:', error);
  
  if (error.status === 429) {
    // Rate limited - show friendly message
    return {
      message: 'Too many requests. Please wait a moment.',
      canRetry: false,
    };
  }
  
  if (error.status >= 500) {
    // Server error - allow retry
    return {
      message: 'Server temporarily unavailable. Retrying...',
      canRetry: true,
    };
  }
  
  return {
    message: error.info?.error || 'Something went wrong',
    canRetry: true,
  };
};

export { swrConfig };
