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

  // Generate a unique and consistent identifier for the article
  const getArticleIdentifier = () => {
    if (articleData.id && typeof articleData.id === 'string') {
      return encodeURIComponent(articleData.id);
    }
    if (articleData._id && typeof articleData._id === 'string') {
      return encodeURIComponent(articleData._id);
    }
    if (articleData.uri && typeof articleData.uri === 'string') {
      return encodeURIComponent(articleData.uri.split('/').pop());
    }
    if (articleData.url && typeof articleData.url === 'string') {
      const urlParts = articleData.url.split('/');
      return encodeURIComponent(urlParts[urlParts.length - 1].replace('.html', ''));
    }
    return encodeURIComponent(articleData.title || 'unknown');
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
      {/* Image Container - Full card height */}
      <div className="relative h-56 sm:h-64 md:h-72 lg:h-64 xl:h-72 overflow-hidden bg-gray-100">
        {!imageError && imageOptions.length > 0 ? (
          <img
            src={imageOptions[currentImageIndex]?.url}
            alt={imageOptions[currentImageIndex]?.alt || articleData.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={handleImageError}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
            <span className="text-5xl">📰</span>
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Section badge */}
        {articleData.section && (
          <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
            {articleData.section}
          </span>
        )}

        {/* Title overlay on image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <h2 className="text-white font-bold text-base sm:text-lg md:text-xl leading-snug line-clamp-3 group-hover:text-blue-200 transition-colors">
            {articleData.title}
          </h2>
        </div>
      </div>
    </Link>
  );
};

export default NewsCard;