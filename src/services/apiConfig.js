// Simple API Configuration
// Just use the environment variable directly

const API_BASE_URL = process.env.REACT_APP_API_URL;

console.log('🔧 API Configuration:', API_BASE_URL);

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
export default {
  getBaseURL: () => API_BASE_URL,
  request: makeAPIRequest,
};

// No more complex initialization needed
export const initializeAPI = () => {
  console.log('✅ Simple API initialized:', API_BASE_URL);
  return Promise.resolve(API_BASE_URL);
};
