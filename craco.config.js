const webpack = require('webpack');
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          "crypto": require.resolve("crypto-browserify"),
          "buffer": require.resolve("buffer/"),
          "path": require.resolve("path-browserify"),
          "os": require.resolve("os-browserify/browser"),
          "stream": require.resolve("stream-browserify"),
          "vm": require.resolve("vm-browserify"),
          "assert": require.resolve("assert/"),
          "zlib": require.resolve("browserify-zlib"),
          "https": require.resolve("https-browserify"),
          "http": require.resolve("stream-http"),
          "util": require.resolve("util/"),
          "process/browser": require.resolve("process/browser"),
          "fs": false,
          "net": false,
          "tls": false,
          "child_process": false
        }
      },
      plugins: [
        // Work around for Buffer is undefined:
        // https://github.com/webpack/changelog-v5/issues/10
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      ]
    },
    plugins: [
      // Plugin to fix "process is not defined" error:
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
    ],
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'https://webstorybackend.onrender.com',
        changeOrigin: true,
        secure: true,
      }
    }
  }
};