import React from 'react';
import { Link } from 'react-router-dom';

const RelatedArticles = ({ section, articles = [] }) => {
  return (
    <div className="related-articles mt-8">
      <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
      
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map(article => (
            <div key={article.id} className="bg-white rounded-lg shadow-sm p-4">
              <span className="text-sm font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                {article.section}
              </span>
              <h3 className="font-bold mt-2">
                <Link to={`/article/${article.id}`} className="hover:text-blue-700">
                  {article.title}
                </Link>
              </h3>
              <p className="text-sm text-gray-600 mt-1">{article.byline}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-bold">More from {section}</h3>
            <p className="text-gray-600">Related articles would appear here based on the article's category.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-bold">Trending Now</h3>
            <p className="text-gray-600">Popular articles from across all categories would appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatedArticles;