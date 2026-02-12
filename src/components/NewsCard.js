import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const NewsCard = ({ article, id, title, abstract, byline, published_date, image, section, uri, url, category, source, date }) => {
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // If article prop is provided, use it, otherwise use individual props
  const articleData = article || {
    id: id,
    title: title,
    abstract: abstract,
    byline: byline,
    published_date: date || published_date,
    section: category || section,
    uri: uri,
    url: url,
    multimedia: image ? [{ url: image }] : [],
    imageUrl: image
  };

  // Generate a clean, SEO-friendly slug for the article
  const getArticleIdentifier = () => {
    // Priority 1: Use MongoDB _id (most reliable)
    if (articleData._id && typeof articleData._id === 'string') {
      return articleData._id;
    }

    // Priority 2: Use id if it's a MongoDB ObjectId (24 hex chars)
    if (articleData.id && typeof articleData.id === 'string') {
      if (articleData.id.match(/^[a-f0-9]{24}$/i)) {
        return articleData.id;
      }
    }

    // Priority 3: Create clean slug from title (SEO-friendly)
    if (articleData.title && typeof articleData.title === 'string') {
      const slug = articleData.title
        .toLowerCase()
        .replace(/['']/g, '')           // Remove apostrophes
        .replace(/[^a-z0-9\s-]/g, '')   // Remove special chars
        .replace(/\s+/g, '-')           // Replace spaces with hyphens
        .replace(/-+/g, '-')            // Remove duplicate hyphens
        .replace(/^-|-$/g, '')          // Trim hyphens from ends
        .substring(0, 80);              // Limit length for URL

      // Add a short hash from the URL or id for uniqueness
      const hash = (articleData.url || articleData.id || articleData.title)
        .split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
        .toString(36).replace('-', '').substring(0, 6);

      return `${slug}-${hash}`;
    }

    // Priority 4: Extract slug from URI
    if (articleData.uri && typeof articleData.uri === 'string') {
      const uriSlug = articleData.uri.split('/').pop();
      if (uriSlug && !uriSlug.includes('http')) {
        return encodeURIComponent(uriSlug);
      }
    }

    // Fallback: Generate from URL filename (not the full URL)
    if (articleData.url && typeof articleData.url === 'string') {
      const urlParts = articleData.url.split('/');
      const filename = urlParts[urlParts.length - 1]
        .replace(/\.html?$/i, '')
        .replace(/[^a-z0-9-]/gi, '-')
        .toLowerCase();
      return filename || 'article';
    }

    return 'article';
  };

  // Enhanced image detection with multiple fallbacks
  const getImageOptions = () => {
    const imageOptions = [];

    if (articleData.imageUrl && articleData.imageUrl.trim()) {
      imageOptions.push({
        url: articleData.imageUrl,
        alt: articleData.title || 'News article image'
      });
    }

    if (articleData.image_url && articleData.image_url.trim()) {
      imageOptions.push({
        url: articleData.image_url,
        alt: articleData.title || 'News article image'
      });
    }

    if (articleData.multimedia && Array.isArray(articleData.multimedia)) {
      articleData.multimedia.forEach((media, index) => {
        if (media.url && media.url.trim()) {
          imageOptions.push({
            url: media.url,
            alt: media.caption || articleData.title || `News image ${index + 1}`
          });
        }
      });
    }

    return imageOptions;
  };

  const handleImageError = () => {
    const imageOptions = getImageOptions();
    if (currentImageIndex < imageOptions.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else {
      setImageError(true);
    }
  };

  const articleIdentifier = getArticleIdentifier();
  const imageOptions = getImageOptions();

  return (
    <Link
      to={`/article/${articleIdentifier}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full touch-manipulation news-card"
    >
      {/* Image Container - Taller on mobile like hero */}
      <div className="relative aspect-[4/5] sm:aspect-[4/3] md:aspect-[16/10] overflow-hidden bg-gray-200">
        {!imageError && imageOptions.length > 0 ? (
          <img
            src={imageOptions[currentImageIndex]?.url}
            alt={imageOptions[currentImageIndex]?.alt || articleData.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={handleImageError}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
            <span className="text-5xl">📰</span>
          </div>
        )}

        {/* Gradient overlay for text readability - stronger like hero */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Section badge */}
        {articleData.section && (
          <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded uppercase tracking-wider mb-2">
            {articleData.section}
          </span>
        )}

        {/* Title overlay on image - more prominent like hero */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <h2 className="text-white font-bold text-lg sm:text-xl md:text-xl leading-tight line-clamp-3 group-hover:text-blue-200 transition-colors font-serif">
            {articleData.title}
          </h2>
        </div>
      </div>
    </Link>
  );
};

export default NewsCard;