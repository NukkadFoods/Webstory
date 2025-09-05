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
    { name: 'Articles', path: '/articles' },
    { name: 'Politics', path: '/category/politics' },
    { name: 'Business', path: '/category/business' },
    { name: 'Technology', path: '/category/technology' },
    { name: 'Health', path: '/category/health' },
    { name: 'Finance', path: '/category/finance' },
    { name: 'Entertainment', path: '/category/entertainment' },
    { name: 'Wall Street', path: '/category/wallstreet' },
  ];

  return (
    <header className="bg-blue-700 shadow">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img src={logo} alt="Forexyy Logo" className="h-16 mr-3" />
              <span className="text-2xl font-bold text-white">Forexyy</span>
            </Link>
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-white focus:outline-none mr-4"
              >
                <FontAwesomeIcon icon={faSearch} size="lg" />
              </button>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white focus:outline-none"
              >
                <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} size="lg" />
              </button>
            </div>
          </div>
          
          {/* Search box for mobile - Only appears when search is active */}
          {searchOpen && (
            <div className="md:hidden mt-4">
              <form onSubmit={handleSearch} className="flex w-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 flex-grow border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit" 
                  className="bg-white text-blue-700 px-3 py-2 rounded-r hover:bg-gray-100 focus:outline-none"
                >
                  <FontAwesomeIcon icon={faSearch} />
                </button>
              </form>
            </div>
          )}
          
          <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block mt-4 md:mt-0`}>
            <ul className="flex flex-col md:flex-row md:items-center md:space-x-6">
              {categories.map((category) => (
                <li key={category.name} className="my-2 md:my-0">
                  <Link 
                    to={category.path} 
                    className="text-white hover:text-blue-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          {/* Desktop search */}
          <div className="hidden md:block">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                placeholder="Search for news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 w-40 lg:w-64 border border-white rounded-l focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button 
                type="submit" 
                className="bg-white text-blue-700 px-3 py-1 rounded-r hover:bg-blue-100 focus:outline-none"
              >
                <FontAwesomeIcon icon={faSearch} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;