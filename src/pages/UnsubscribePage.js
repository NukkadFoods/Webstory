import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header';

const API_URL = process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com';

const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading, confirm, success, error
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link. Please use the link from your newsletter email.');
      return;
    }

    // Verify the token is valid
    const verifyToken = async () => {
      try {
        // We'll just show the confirmation page since the backend will validate on submit
        setStatus('confirm');
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred. Please try again.');
      }
    };

    verifyToken();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const response = await fetch(`${API_URL}/api/newsletter/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('You have been successfully unsubscribed from the Forexyy Newsletter.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to unsubscribe. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again or contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600">
      <Header />

      <div className="flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-12 text-center">
          {/* Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl font-bold">F</span>
          </div>

          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </>
          )}

          {status === 'confirm' && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Unsubscribe from Newsletter
              </h1>
              <p className="text-gray-600 mb-6">
                Are you sure you want to unsubscribe from the Forexyy Newsletter?
              </p>

              {email && (
                <div className="bg-gray-100 px-4 py-2 rounded-lg inline-block mb-6 font-mono text-gray-700">
                  {email}
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleUnsubscribe}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Yes, Unsubscribe'}
                </button>
                <Link
                  to="/"
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-5xl mb-4 text-green-500">&#10003;</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Successfully Unsubscribed
              </h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                to="/"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Return to Forexyy
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-5xl mb-4 text-red-500">&#10007;</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Something Went Wrong
              </h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                to="/"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Return to Forexyy
              </Link>
            </>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-gray-400 text-sm">
              Forexyy Newsletter &bull; AI-Powered News Analysis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnsubscribePage;
