module.exports = {
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
