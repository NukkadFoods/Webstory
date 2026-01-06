import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import logo from '../logo/1756335129.png';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  // Focus input when search is opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const categories = [
    { name: 'Top Stories', path: '/' },
    { name: 'World', path: '/category/world' },
    { name: 'US', path: '/category/us' },
    { name: 'Politics', path: '/category/politics' },
    { name: 'Business', path: '/category/business' },
    { name: 'Technology', path: '/category/technology' },
    { name: 'Health', path: '/category/health' },
    { name: 'Sports', path: '/category/sports' },
    { name: 'Entertainment', path: '/category/entertainment' },
    { name: 'Finance', path: '/category/finance' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="font-serif text-xl font-bold tracking-tighter flex items-center gap-2">
            <img src={logo} alt="Forexyy Logo" className="w-8 h-8 rounded-lg object-cover" />
            <span>Forexyy</span>
          </Link>

          {/* Scrollable Nav (Center) */}
          <div className="flex-1 mx-6 overflow-x-auto no-scrollbar mask-linear-fade hidden md:block">
            <div className="flex gap-2">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  to={cat.path}
                  className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Actions (Right) */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            >
              <FontAwesomeIcon icon={faSearch} />
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            >
              <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav>
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li key={category.name}>
                    <Link 
                      to={category.path} 
                      className="block py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded px-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        {/* Search box - appears below header when active */}
        {searchOpen && (
          <div className="py-4 border-t border-gray-200">
            <form onSubmit={handleSearch} className="flex w-full max-w-2xl mx-auto">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search for news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 flex-grow border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                type="submit" 
                className="bg-blue-600 text-white px-6 py-2 rounded-r hover:bg-blue-700 focus:outline-none"
              >
                <FontAwesomeIcon icon={faSearch} />
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;