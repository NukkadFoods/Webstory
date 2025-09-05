import React, { useState } from 'react';

const NewsletterSignup = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📧 NewsletterSignup form submitted!');
    
    // Reset states
    setError(null);
    setLoading(true);
    
    // Basic validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      console.log('📧 NewsletterSignup API URL:', apiUrl);
      console.log('📧 NewsletterSignup submitting email:', email);
      
      const response = await fetch(`${apiUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim()
        }),
      });

      console.log('📧 NewsletterSignup response status:', response.status);
      const data = await response.json();
      console.log('📧 NewsletterSignup response data:', data);

      if (data.success) {
        setSubmitted(true);
        setEmail('');
        setMessage(data.message || 'Successfully subscribed to the newsletter');
      } else {
        setError(data.message || 'Failed to subscribe. Please try again later.');
      }
    } catch (err) {
      setError('Failed to subscribe. Please try again later.');
      console.error('📧 NewsletterSignup subscription error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-lg font-bold mb-1">Subscribe to Our Newsletter</h3>
      
      {!submitted ? (
        <>
          <p className="text-gray-600 text-sm mb-3">
            Get the latest news delivered directly to your inbox.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              />
              {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
            </div>
            
            <button
              type="submit"
              className={`w-full bg-blue-700 text-white py-1 px-3 text-sm rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? 'Subscribing...' : 'Subscribe Now'}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center py-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h4 className="text-base font-semibold mb-1">Thanks for subscribing!</h4>
          <p className="text-gray-600 text-sm">{message || "You've successfully signed up."}</p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-2 text-sm text-blue-700 hover:underline"
          >
            Sign up another email
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsletterSignup;