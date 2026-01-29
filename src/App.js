import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import CategoryPage from './pages/CategoryPage';
import SearchPage from './pages/SearchPage';
import ArticlesPage from './pages/ArticlesPage';
import ReelsPage from './pages/ReelsPage';
import ErrorBoundary from './components/ErrorBoundary';
import { adSenseManager } from './utils/adSenseManager';
import './App.css';

// Component to handle route changes and reset ads
function RouteHandler({ onLocationChange }) {
  const location = useLocation();

  useEffect(() => {
    // Reset ads when route changes to prevent conflicts
    adSenseManager.resetAds();
    // Notify parent of location change
    if (onLocationChange) {
      onLocationChange(location.pathname);
    }
  }, [location.pathname, onLocationChange]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/article/:id" element={<ArticlePage />} />
      <Route path="/category/:category" element={<CategoryPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/articles" element={<ArticlesPage />} />
      <Route path="/reels" element={<ReelsPage />} />
    </Routes>
  );
}

function App() {
  const [currentPath, setCurrentPath] = React.useState('/');
  
  // Simple app initialization
  useEffect(() => {
    console.log('🚀 Webstory frontend app started');
    console.log('🔧 API URL:', process.env.REACT_APP_API_URL);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen flex flex-col">
          <main className="flex-grow">
            <ErrorBoundary>
              <RouteHandler onLocationChange={setCurrentPath} />
            </ErrorBoundary>
          </main>
          <Footer />
          <SpeedInsights />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;