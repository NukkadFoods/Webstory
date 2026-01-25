import useSWR from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

export function useArticles(category = 'home') {
  const { data, error, mutate } = useSWR(
    `/api/articles?category=${category}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 300000, // 5 minutes
      dedupingInterval: 60000, // 1 minute
      onError: (err) => {
        console.error('Article fetching error:', err);
      }
    }
  );

  return {
    articles: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}

export function useSearch(query) {
  const { data, error } = useSWR(
    query ? `/api/search?q=${encodeURIComponent(query)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      keepPreviousData: true
    }
  );

  return {
    results: data,
    isLoading: !error && !data,
    isError: error
  };
}

export function useArticleById(id) {
  const { data, error } = useSWR(
    id ? `/api/articles/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
      onSuccess: (data) => {
        // Pre-fetch related articles
        if (data?.keywords?.length > 0) {
          data.keywords.forEach(keyword => {
            const encodedKeyword = encodeURIComponent(keyword);
            fetcher(`/api/search?q=${encodedKeyword}`);
          });
        }
      }
    }
  );

  return {
    article: data,
    isLoading: !error && !data,
    isError: error
  };
}
