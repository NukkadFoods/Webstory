import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Check, AlertTriangle } from 'lucide-react';


const Footer = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', null
  const [message, setMessage] = useState('');

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    console.log('🔔 Footer newsletter form submitted!');

    if (!email.trim()) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setStatus(null);
    setMessage('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      console.log('🔔 Footer newsletter API URL:', apiUrl);
      console.log('🔔 Footer submitting email:', email);

      const response = await fetch(`${apiUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim()
        }),
      });

      console.log('🔔 Footer newsletter response status:', response.status);
      const data = await response.json();
      console.log('🔔 Footer newsletter response data:', data);

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Successfully subscribed to newsletter!');
        setEmail('');

        // Track subscription success
        if (window.gtag) {
          window.gtag('event', 'newsletter_signup', {
            method: 'footer',
            email_provided: !!email
          });
        }
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to subscribe. Please try again.');
      }
    } catch (error) {
      console.error('🔔 Footer newsletter subscription error:', error);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: 'Politics', path: '/category/politics' },
    { name: 'Business', path: '/category/business' },
    { name: 'Technology', path: '/category/technology' },
    { name: 'Health', path: '/category/health' },
    { name: 'Entertainment', path: '/category/entertainment' },
  ];

  return (
    <footer className="bg-gray-800 text-white py-8" style={{ minHeight: '320px' }}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <h3 className="text-xl font-bold">Forexyy</h3>
            </div>
            <p className="text-gray-400">
              Your trusted source for the latest news and insights in forex trading, financial markets, and global economic updates.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Categories</h3>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.name}>
                  <Link to={category.path} className="text-gray-400 hover:text-white">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Connect With Us</h3>
            <div className="flex space-x-4 mb-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Twitter size={20} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Instagram size={20} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                <Youtube size={20} />
              </a>
            </div>
            <p className="text-gray-400">
              Subscribe to our newsletter for daily updates
            </p>
            <form onSubmit={handleNewsletterSubmit} className="mt-2 flex">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="px-3 py-2 text-black flex-1 rounded-l outline-none"
                disabled={loading}
                required
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="bg-blue-700 px-4 py-2 rounded-r hover:bg-blue-800 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : 'Subscribe'}
              </button>
            </form>

            {/* Status Message */}
            {status && (
              <div className={`mt-2 text-sm flex items-center gap-1 ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {status === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
          <p>© {new Date().getFullYear()} Forexyy. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;