const CacheService = require('./cache/cacheService');
const mongoose = require('mongoose');

class MonitoringService {
  static async collectMetrics() {
    const metrics = {
      timestamp: new Date(),
      redis: await this.getRedisMetrics(),
      mongodb: await this.getMongoMetrics(),
      api: await this.getAPIMetrics(),
      cache: await this.getCacheMetrics()
    };

    // Store metrics in Redis for tracking
    await CacheService.cacheSearchResults(
      `metrics:${Date.now()}`,
      metrics,
      86400 // 24 hours
    );

    return metrics;
  }

  static async getRedisMetrics() {
    try {
      const stats = await CacheService.getUsageStats();
      const cacheHitRate = stats.homepageHits + stats.searchHits > 0 
        ? ((stats.homepageHits + stats.searchHits) / 
           (stats.homepageHits + stats.homepageMisses + stats.searchHits + stats.searchMisses)) * 100
        : 0;

      return {
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        totalHits: stats.homepageHits + stats.searchHits,
        totalMisses: stats.homepageMisses + stats.searchMisses
      };
    } catch (error) {
      console.error('Redis metrics error:', error);
      return null;
    }
  }

  static async getMongoMetrics() {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      const serverStatus = await db.command({ serverStatus: 1 });

      return {
        collections: stats.collections,
        documentCount: stats.objects,
        storageSize: stats.storageSize,
        activeConnections: serverStatus.connections.current,
        totalOperations: serverStatus.opcounters
      };
    } catch (error) {
      console.error('MongoDB metrics error:', error);
      return null;
    }
  }

  static async getAPIMetrics() {
    try {
      const apiCalls = await CacheService.getSearchResults('api-calls:total');
      const rateLimited = await CacheService.getSearchResults('api-calls:limited');

      return {
        totalCalls: parseInt(apiCalls) || 0,
        rateLimited: parseInt(rateLimited) || 0,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('API metrics error:', error);
      return null;
    }
  }

  static async getCacheMetrics() {
    try {
      const metrics = {
        categories: {},
        searches: {}
      };

      // Get category cache stats
      const categories = ['technology', 'business', 'politics', 'entertainment'];
      for (const category of categories) {
        const hits = await CacheService.getSearchResults(`cache:category:${category}:hit`);
        const misses = await CacheService.getSearchResults(`cache:category:${category}:miss`);
        metrics.categories[category] = {
          hits: parseInt(hits) || 0,
          misses: parseInt(misses) || 0
        };
      }

      return metrics;
    } catch (error) {
      console.error('Cache metrics error:', error);
      return null;
    }
  }

  // Generate monitoring report
  static async generateReport() {
    const metrics = await this.collectMetrics();
    
    const report = {
      summary: {
        cacheEfficiency: `${metrics.redis.cacheHitRate}% hit rate`,
        databaseHealth: metrics.mongodb.activeConnections < 100 ? 'Good' : 'Warning',
        apiUsage: `${metrics.api.totalCalls} calls (${metrics.api.rateLimited} rate limited)`
      },
      details: metrics
    };

    // Store report in Redis
    await CacheService.cacheSearchResults(
      `report:${Date.now()}`,
      report,
      86400 // 24 hours
    );

    return report;
  }
}

module.exports = MonitoringService;
