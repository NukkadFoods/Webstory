const CacheService = require('../services/cache/cacheService');

const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    const cacheKey = `${req.originalUrl || req.url}`;
    try {
      const cached = await CacheService.getSearchResults(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      res.sendResponse = res.json;
      res.json = (body) => {
        CacheService.cacheSearchResults(cacheKey, body, duration);
        res.sendResponse(body);
      };
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

const rateLimitMiddleware = async (req, res, next) => {
  const category = req.body.category || 'default';
  try {
    const allowed = await CacheService.checkRateLimit(category);
    if (!allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: 900 // 15 minutes
      });
    }
    next();
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    next();
  }
};

module.exports = {
  cacheMiddleware,
  rateLimitMiddleware
};
