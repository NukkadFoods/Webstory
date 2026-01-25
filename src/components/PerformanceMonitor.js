import React, { useState, useEffect } from 'react';
import { useCacheStats } from '../hooks/useArticles';

const PerformanceMonitor = ({ isAdmin = false }) => {
  const { stats, isLoading, isError } = useCacheStats();
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState({
    apiCalls: 0,
    cacheHits: 0,
    avgResponseTime: 0,
    errorRate: 0,
  });

  // Track client-side performance
  useEffect(() => {
    const trackPerformance = () => {
      if (window.performance) {
        const navigation = performance.getEntriesByType('navigation')[0];
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        
        setPerformanceData(prev => ({
          ...prev,
          pageLoadTime: loadTime,
          domInteractive: navigation.domInteractive - navigation.navigationStart,
        }));
      }
    };

    trackPerformance();
  }, []);

  if (!isAdmin && process.env.NODE_ENV === 'production') {
    return null;
  }

  if (isError) {
    return null;
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getCacheEfficiency = (cache) => {
    if (!cache || !cache.hits || !cache.misses) return 0;
    const total = cache.hits + cache.misses;
    return total > 0 ? ((cache.hits / total) * 100).toFixed(1) : 0;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 mb-2"
        title="Performance Monitor"
      >
        📊
      </button>

      {/* Performance Panel */}
      {isVisible && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Monitor
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading stats...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cache Statistics */}
              {stats && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Cache Performance</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(stats).map(([cacheName, cacheData]) => (
                      <div key={cacheName} className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium capitalize">{cacheName.replace('Cache', '')}:</span>
                          <span className="text-green-600 dark:text-green-400">
                            {getCacheEfficiency(cacheData)}% hit rate
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>Keys: {cacheData.keys || 0}</span>
                          <span>Hits: {cacheData.hits || 0}</span>
                          <span>Misses: {cacheData.misses || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Performance */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Client Performance</h4>
                <div className="space-y-1 text-sm">
                  {performanceData.pageLoadTime && (
                    <div className="flex justify-between">
                      <span>Page Load:</span>
                      <span className={performanceData.pageLoadTime < 2000 ? 'text-green-600' : 'text-yellow-600'}>
                        {formatDuration(performanceData.pageLoadTime)}
                      </span>
                    </div>
                  )}
                  {performanceData.domInteractive && (
                    <div className="flex justify-between">
                      <span>DOM Interactive:</span>
                      <span className={performanceData.domInteractive < 1000 ? 'text-green-600' : 'text-yellow-600'}>
                        {formatDuration(performanceData.domInteractive)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Memory Usage (if available) */}
              {window.performance && window.performance.memory && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Memory Usage</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Used:</span>
                      <span>{formatBytes(window.performance.memory.usedJSHeapSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{formatBytes(window.performance.memory.totalJSHeapSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Limit:</span>
                      <span>{formatBytes(window.performance.memory.jsHeapSizeLimit)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Connection Info */}
              {navigator.connection && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Connection</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="capitalize">{navigator.connection.effectiveType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Downlink:</span>
                      <span>{navigator.connection.downlink} Mbps</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quick Actions</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 py-1 px-2 rounded text-xs"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => {
                      if ('caches' in window) {
                        caches.keys().then(names => {
                          names.forEach(name => caches.delete(name));
                        });
                      }
                      localStorage.clear();
                      sessionStorage.clear();
                    }}
                    className="flex-1 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-800 dark:text-red-200 py-1 px-2 rounded text-xs"
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
