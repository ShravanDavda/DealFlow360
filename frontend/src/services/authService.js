import api from './api';

/**
 * Register a new user
 * @param {Object} userData - { username, email, password }
 * @returns {Promise<Object>} Axios response data
 */
export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

/**
 * Authenticate and log in user
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} Axios response data
 */
export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

