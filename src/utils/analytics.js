/**
 * Google Analytics (GA4) Event Tracking Utility
 * Measurement ID: G-LK5YSTVD3Y
 */

export const GA_TRACKING_ID = 'G-LK5YSTVD3Y';

/**
 * Track page views (used for SPA route transitions)
 */
export const trackPageView = (path, title = '') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: path,
      page_title: title || document.title,
    });
  }
};

/**
 * Generic event tracker
 */
export const trackEvent = (eventName, params = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

/**
 * Track article views
 */
export const trackArticleView = (article) => {
  if (!article) return;
  trackEvent('view_article', {
    article_id: article.id || article.url,
    article_title: article.title,
    category: article.section || article.category || 'general',
    source: article.source || 'nytimes'
  });
};

/**
 * Track audio commentary plays
 */
export const trackAudioListen = (articleTitle, action = 'play') => {
  trackEvent('audio_interaction', {
    action: action,
    article_title: articleTitle
  });
};

/**
 * Track social sharing
 */
export const trackShare = (platform, articleTitle) => {
  trackEvent('share', {
    method: platform,
    content_type: 'article',
    item_id: articleTitle
  });
};

/**
 * Track category browsing
 */
export const trackCategoryView = (category) => {
  trackEvent('view_category', {
    category_name: category
  });
};

/**
 * Track search queries
 */
export const trackSearch = (searchQuery) => {
  trackEvent('search', {
    search_term: searchQuery
  });
};
