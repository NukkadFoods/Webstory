const cron = require('node-cron');
const CacheService = require('./cache/cacheService');
const { getTopStories } = require('./storyService');
const { saveArticles } = require('./db/articleService');

class CronService {
  static initializeJobs() {
    // Pre-fetch and cache homepage content every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      console.log('Running homepage pre-fetch job');
      try {
        const articles = await getTopStories('home');
        await CacheService.cacheHomePageArticles(articles);
        await saveArticles(articles);
      } catch (error) {
        console.error('Homepage pre-fetch error:', error);
      }
    });

    // Pre-fetch popular categories every 30 minutes
    const popularCategories = ['technology', 'business', 'politics', 'entertainment'];
    cron.schedule('*/30 * * * *', async () => {
      console.log('Running category pre-fetch job');
      for (const category of popularCategories) {
        try {
          const articles = await getTopStories(category);
          await CacheService.cacheCategoryArticles(category, articles);
          await saveArticles(articles);
        } catch (error) {
          console.error(`Category ${category} pre-fetch error:`, error);
        }
      }
    });

    // Clean up expired Redis cache daily at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('Running cache cleanup job');
      await CacheService.clearExpiredCache();
    });

    // Generate detailed monitoring report every hour
    cron.schedule('0 * * * *', async () => {
      console.log('Generating monitoring report');
      const MonitoringService = require('./monitoringService');
      const report = await MonitoringService.generateReport();
      console.log('Monitoring Report:', JSON.stringify(report.summary, null, 2));
    });
  }
}

module.exports = CronService;
