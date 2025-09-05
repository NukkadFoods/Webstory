import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faClock } from '@fortawesome/free-solid-svg-icons';

// Graffiti images - you'll need to replace these URLs with your actual graffiti images
const graffitiImages = [
  'https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?q=80&w=300&auto=format',
  'https://images.unsplash.com/photo-1547333590-47fae5f58d21?q=80&w=300&auto=format',
  'https://images.unsplash.com/photo-1572867729025-bd6bc6ff50eb?q=80&w=300&auto=format',
  'https://images.unsplash.com/photo-1569230516306-5a8cb5586399?q=80&w=300&auto=format'
];

const HeroSection = ({ featuredArticle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <section className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-12 relative overflow-hidden">
      {/* Decorative graffiti images - positioned absolutely */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-10">
        <div className="absolute top-0 left-0">
          <img src={graffitiImages[0]} alt="" className="w-40 md:w-52 rotate-12" />
        </div>
        <div className="absolute bottom-0 left-10 md:left-20">
          <img src={graffitiImages[1]} alt="" className="w-36 md:w-48 -rotate-6" />
        </div>
        <div className="absolute top-10 right-10 md:right-20">
          <img src={graffitiImages[2]} alt="" className="w-36 md:w-48 rotate-3" />
        </div>
        <div className="absolute bottom-0 right-0">
          <img src={graffitiImages[3]} alt="" className="w-40 md:w-52 -rotate-12" />
        </div>
      </div>

      {/* Main content - with higher z-index to appear above the graffiti */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4" style={{textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'}}>Stay Informed with the Latest US News</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Comprehensive coverage of politics, business, technology, and more from across the United States
          </p>
          <div className="max-w-md mx-auto relative">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search for news..."
                className="w-full px-4 py-3 rounded-full text-gray-800 focus:outline-none shadow-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <FontAwesomeIcon icon={faSearch} />
              </button>
            </form>
          </div>
        </div>

        {featuredArticle && (
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl overflow-hidden mt-6 shadow-lg">
            <div className="md:flex">
              <div className="md:w-2/3 p-6">
                <span className="inline-block bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded mb-3">
                  {featuredArticle.section?.toUpperCase()}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold mb-2">
                  <Link to={`/article/${featuredArticle.id}`} className="hover:underline">
                    {featuredArticle.title}
                  </Link>
                </h3>
                <p className="text-white text-opacity-80 mb-4">{featuredArticle.abstract}</p>
                <div className="flex items-center text-sm">
                  <FontAwesomeIcon icon={faClock} className="mr-1" />
                  <span className="mr-3">{new Date(featuredArticle.published_date).toLocaleDateString()}</span>
                  <span>{featuredArticle.byline}</span>
                </div>
                <Link 
                  to={`/article/${featuredArticle.id}`}
                  className="inline-block mt-4 px-4 py-2 bg-white text-blue-600 rounded-md font-medium hover:bg-opacity-90"
                >
                  Read More
                </Link>
              </div>
              <div className="md:w-1/3">
                {featuredArticle.multimedia && featuredArticle.multimedia.length > 0 ? (
                  <img 
                    src={featuredArticle.multimedia[0].url} 
                    alt={featuredArticle.title}
                    className="h-full w-full object-cover"
                    style={{ minHeight: '250px' }}
                  />
                ) : (
                  <div className="bg-blue-800 h-full flex items-center justify-center">
                    <span className="text-white">No image available</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;