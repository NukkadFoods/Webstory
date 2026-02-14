import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import ErrorBoundary from './components/ErrorBoundary';
import { adSenseManager } from './utils/adSenseManager';
import './App.css';

// Route-level code splitting — each page loads only when navigated to
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ArticlePage = React.lazy(() => import('./pages/ArticlePage'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const ArticlesPage = React.lazy(() => import('./pages/ArticlesPage'));
const ReelsPage = React.lazy(() => import('./pages/ReelsPage'));
const UnsubscribePage = React.lazy(() => import('./pages/UnsubscribePage'));
const Footer = React.lazy(() => import('./components/Footer'));

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
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/article/:id" element={<ArticlePage />} />
        <Route path="/category/:category" element={<CategoryPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/reels" element={<ReelsPage />} />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
      </Routes>
    </Suspense>
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
          <Suspense fallback={<div style={{ minHeight: '320px', background: '#1f2937' }} />}>
            <Footer />
          </Suspense>
          <SpeedInsights />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;