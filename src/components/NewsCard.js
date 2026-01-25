import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';

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
    imageUrl: image // Add imageUrl for consistency
  };
  
  // Format the date to be more readable
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Truncate text to a certain length and add ellipsis
  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    // Find the last space within the limit to avoid cutting words
    const lastSpaceIndex = text.substr(0, maxLength).lastIndexOf(' ');
    const truncatedText = text.substr(0, lastSpaceIndex > 0 ? lastSpaceIndex : maxLength);
    return `${truncatedText}...`;
  };

  // Generate a unique and consistent identifier for the article
  const getArticleIdentifier = () => {
    // Priority order: use 'id' field first (our consistent identifier)
    if (articleData.id && typeof articleData.id === 'string') {
      return encodeURIComponent(articleData.id);
    }
    
    // Fallback to _id for MongoDB documents
    if (articleData._id && typeof articleData._id === 'string') {
      return encodeURIComponent(articleData._id);
    }
    
    // For NYT Top Stories that use URI
    if (articleData.uri && typeof articleData.uri === 'string') {
      return encodeURIComponent(articleData.uri.split('/').pop());
    }
    
    // For NYT Search API that returns web_url
    if (articleData.url && typeof articleData.url === 'string') {
      const urlParts = articleData.url.split('/');
      return encodeURIComponent(urlParts[urlParts.length - 1].replace('.html', ''));
    }
    
    // Fallback - use title
    return encodeURIComponent(articleData.title || 'unknown');
  };
  
  // Enhanced image detection with multiple fallbacks
  const getImageOptions = () => {
    console.log(`🖼️ Getting image options for "${articleData.title?.substring(0, 30)}..."`);
    
    const imageOptions = [];
    
    // PRIORITY 1: Check imageUrl field first (most reliable)
    if (articleData.imageUrl && articleData.imageUrl.trim()) {
      imageOptions.push({
        url: articleData.imageUrl,
        alt: articleData.title || 'News article image'
      });
      console.log(`✅ Found imageUrl: ${articleData.imageUrl}`);
    }
    
    // PRIORITY 2: Check image_url field (newsdata.io format)
    if (articleData.image_url && articleData.image_url.trim()) {
      imageOptions.push({
        url: articleData.image_url,
        alt: articleData.title || 'News article image'
      });
      console.log(`✅ Found image_url: ${articleData.image_url}`);
    }
    
    // PRIORITY 3: Check multimedia array
    if (articleData.multimedia && Array.isArray(articleData.multimedia)) {
      articleData.multimedia.forEach((media, index) => {
        if (media.url && media.url.trim()) {
          imageOptions.push({
            url: media.url,
            alt: media.caption || articleData.title || `News image ${index + 1}`
          });
          console.log(`✅ Found multimedia[${index}]: ${media.url}`);
        }
      });
    }
    
    // Only add fallback if absolutely no images found
    if (imageOptions.length === 0) {
      console.log(`⚠️ No images found for "${articleData.title?.substring(0, 30)}..." - article has no image data`);
    }
    
    console.log(`📊 Total image options found: ${imageOptions.length}`);
    return imageOptions;
  };  const handleImageError = () => {
    const imageOptions = getImageOptions();
    console.log(`Image error for article "${articleData.title}". Current index: ${currentImageIndex}, Total options: ${imageOptions.length}`);
    console.log(`Failed image URL: ${imageOptions[currentImageIndex]}`);
    
    if (currentImageIndex < imageOptions.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else {
      console.log(`All images failed for article "${articleData.title}". Using fallback.`);
      setImageError(true);
    }
  };
  
  const articleIdentifier = getArticleIdentifier();
  const truncatedAbstract = truncateText(articleData.abstract, 100);
  
  // Debug logging to help with navigation issues
  if (process.env.NODE_ENV === 'development') {
    console.log(`NewsCard: Article "${articleData.title?.substring(0, 50)}..." has identifier: ${articleIdentifier}`);
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 news-card h-full flex flex-col">
      <Link to={`/article/${articleIdentifier}`} className="block overflow-hidden h-48 bg-gray-100 flex items-center justify-center">
        {!imageError && getImageOptions().length > 0 ? (
          <img 
            src={getImageOptions()[currentImageIndex]?.url} 
            alt={getImageOptions()[currentImageIndex]?.alt || articleData.title} 
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
            onError={handleImageError}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center text-gray-600 p-4">
            <div className="text-4xl mb-2">📰</div>
            <div className="text-sm text-center font-medium">{articleData.section || 'News'}</div>
            <div className="text-xs text-center opacity-75">Article Image</div>
          </div>
        )}
        {(imageError || getImageOptions().length === 0) && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <span className="text-sm font-medium">News Article</span>
            </div>
          </div>
        )}
      </Link>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
            {articleData.section}
          </span>
          {articleData.published_date && (
            <span className="text-sm text-gray-500 flex items-center">
              <FontAwesomeIcon icon={faClock} className="mr-1" />
              {formatDate(articleData.published_date)}
            </span>
          )}
        </div>
        
        <h2 className="text-xl font-bold mb-2">
          <Link to={`/article/${articleIdentifier}`} className="text-gray-800 hover:text-blue-700">
            {articleData.title}
          </Link>
        </h2>
        
        <p className="text-gray-600 mb-4">{truncatedAbstract}</p>
        
        {articleData.aiCommentary && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Expert Analysis</h3>
            <p className="text-sm text-gray-700">{truncateText(articleData.aiCommentary, 150)}</p>
          </div>
        )}
        
        <div className="mt-auto">
          <Link 
            to={`/article/${articleIdentifier}`}
            className="mt-2 inline-block text-blue-700 font-medium hover:underline"
          >
            Read more
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;