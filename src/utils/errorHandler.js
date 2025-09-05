class ErrorHandler {
  static async handle(error, service) {
    console.error(`Error in ${service}:`, error);

    // Log error to monitoring service
    await MonitoringService.logError(service, error);

    // Determine error type and appropriate fallback
    switch (service) {
      case 'redis':
        return this.handleRedisError(error);
      case 'mongodb':
        return this.handleMongoError(error);
      case 'groq':
        return this.handleGroqError(error);
      default:
        return this.handleGenericError(error);
    }
  }

  static async handleRedisError(error) {
    // If Redis fails, fall back to MongoDB
    console.log('⚠️ Redis error, falling back to MongoDB');
    return {
      fallbackTo: 'mongodb',
      error: error.message,
      action: 'fallback'
    };
  }

  static async handleMongoError(error) {
    // If MongoDB fails, fall back to in-memory cache
    console.log('⚠️ MongoDB error, falling back to memory cache');
    return {
      fallbackTo: 'memory',
      error: error.message,
      action: 'fallback'
    };
  }

  static async handleGroqError(error) {
    // If Groq API fails, use cached commentary or skip
    console.log('⚠️ Groq API error, using cached commentary');
    return {
      fallbackTo: 'cache',
      error: error.message,
      action: 'skip_commentary'
    };
  }

  static async handleGenericError(error) {
    return {
      error: error.message,
      action: 'retry'
    };
  }
}

// In-memory fallback cache
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, value, expires) {
    this.cache.set(key, value);
    if (expires) {
      this.ttl.set(key, Date.now() + expires * 1000);
    }
  }

  get(key) {
    if (this.ttl.has(key) && Date.now() > this.ttl.get(key)) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }
}

// Retry mechanism
class RetryMechanism {
  static async withRetry(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
}

module.exports = {
  ErrorHandler,
  MemoryCache,
  RetryMechanism
};
