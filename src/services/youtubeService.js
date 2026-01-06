import { getAPIBaseURL } from './apiConfig';

/**
 * Fetch YouTube videos/shorts from the channel
 * @param {number} limit - Number of videos to fetch
 * @returns {Promise<Array>} Array of YouTube videos
 */
export const getYouTubeVideos = async (limit = 10) => {
  try {
    const API_BASE_URL = getAPIBaseURL();
    const response = await fetch(`${API_BASE_URL}/api/youtube/videos?maxResults=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch YouTube videos');
    }
    
    const data = await response.json();
    return data.videos || [];
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return [];
  }
};

/**
 * Fetch channel information
 * @returns {Promise<Object>} Channel data
 */
export const getChannelInfo = async () => {
  try {
    const API_BASE_URL = getAPIBaseURL();
    const response = await fetch(`${API_BASE_URL}/api/youtube/channel`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch channel info');
    }
    
    const data = await response.json();
    return data.channel || null;
  } catch (error) {
    console.error('Error fetching channel info:', error);
    return null;
  }
};
