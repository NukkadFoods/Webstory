import { getAPIBaseURL } from './apiConfig';

/**
 * Fetch YouTube videos/shorts from the channel
 * @param {number} limit - Number of videos to fetch
 * @param {string} pageToken - Token for the next page of results
 * @returns {Promise<Object>} Object containing videos and nextPageToken
 */
export const getYouTubeVideos = async (limit = 10, pageToken = '') => {
  try {
    const API_BASE_URL = getAPIBaseURL();
    const tokenParam = pageToken ? `&pageToken=${pageToken}` : '';
    const response = await fetch(`${API_BASE_URL}/api/youtube/videos?maxResults=${limit}${tokenParam}`);

    if (!response.ok) {
      throw new Error('Failed to fetch YouTube videos');
    }

    const data = await response.json();
    return {
      videos: data.videos || [],
      nextPageToken: data.nextPageToken || null
    };
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return { videos: [], nextPageToken: null };
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
