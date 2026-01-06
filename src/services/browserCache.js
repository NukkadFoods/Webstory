/**
 * Browser Cache Manager with TTL
 * 
 * 3-Tier Architecture:
 * Browser Cache (5min) → Redis (30min) → MongoDB (source of truth)
 * 
 * This reduces:
 * - Redis calls for repeated visits (5min window)
 * - Database queries (Redis handles most requests)
 * - API latency (browser serves instantly from memory)
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_KEY_PREFIX = 'webstory_cache_';

class BrowserCacheManager {
  /**
   * Set item in cache with timestamp
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  set(key, data) {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_TTL
      };
      
      sessionStorage.setItem(
        CACHE_KEY_PREFIX + key, 
        JSON.stringify(cacheEntry)
      );
      
      console.log(`💾 Browser cache set: ${key} (expires in 5min)`);
    } catch (error) {
      console.warn('Failed to set browser cache:', error);
    }
  }

  /**
   * Get item from cache if not expired
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if expired/missing
   */
  get(key) {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY_PREFIX + key);
      
      if (!cached) {
        return null;
      }
      
      const cacheEntry = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now > cacheEntry.expiresAt) {
        console.log(`🕒 Browser cache expired for ${key}, removing...`);
        this.remove(key);
        return null;
      }
      
      const remainingSec = Math.floor((cacheEntry.expiresAt - now) / 1000);
      console.log(`⚡ Browser cache hit: ${key} (${remainingSec}s remaining)`);
      
      return cacheEntry.data;
    } catch (error) {
      console.warn('Failed to get browser cache:', error);
      return null;
    }
  }

  /**
   * Remove specific item from cache
   * @param {string} key - Cache key
   */
  remove(key) {
    try {
      sessionStorage.removeItem(CACHE_KEY_PREFIX + key);
    } catch (error) {
      console.warn('Failed to remove browser cache:', error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  clearExpired() {
    try {
      const now = Date.now();
      const keys = Object.keys(sessionStorage);
      let cleared = 0;
      
      keys.forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          try {
            const cached = sessionStorage.getItem(key);
            const cacheEntry = JSON.parse(cached);
            
            if (now > cacheEntry.expiresAt) {
              sessionStorage.removeItem(key);
              cleared++;
            }
          } catch (e) {
            // Invalid entry, remove it
            sessionStorage.removeItem(key);
            cleared++;
          }
        }
      });
      
      if (cleared > 0) {
        console.log(`🧹 Cleared ${cleared} expired browser cache entries`);
      }
    } catch (error) {
      console.warn('Failed to clear expired cache:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll() {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('🧹 Cleared all browser cache');
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    try {
      const keys = Object.keys(sessionStorage);
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX));
      
      const stats = {
        total: cacheKeys.length,
        valid: 0,
        expired: 0,
        size: 0
      };
      
      const now = Date.now();
      
      cacheKeys.forEach(key => {
        try {
          const cached = sessionStorage.getItem(key);
          stats.size += cached.length;
          
          const cacheEntry = JSON.parse(cached);
          if (now > cacheEntry.expiresAt) {
            stats.expired++;
          } else {
            stats.valid++;
          }
        } catch (e) {
          stats.expired++;
        }
      });
      
      return stats;
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Create singleton instance
const browserCache = new BrowserCacheManager();

// Clear expired entries on page load
browserCache.clearExpired();

// Auto-clear expired entries every 2 minutes
setInterval(() => {
  browserCache.clearExpired();
}, 2 * 60 * 1000);

export default browserCache;
