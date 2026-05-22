// Simple API Configuration
// Use relative URLs in development (proxy handles it), absolute in production

const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment ? '' : (process.env.REACT_APP_API_URL || 'https://webstorybackend.onrender.com');

console.log('🔧 API Configuration:', API_BASE_URL || '(using proxy)');

// Simple API request function
export const makeAPIRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return response;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Simple getter for base URL
export const getAPIBaseURL = () => API_BASE_URL;

// For backward compatibility
const apiConfig = {
  getBaseURL: () => API_BASE_URL,
  request: makeAPIRequest,
};

export default apiConfig;

// No more complex initialization needed
export const initializeAPI = () => {
  console.log('✅ Simple API initialized:', API_BASE_URL);
  return Promise.resolve(API_BASE_URL);
};
