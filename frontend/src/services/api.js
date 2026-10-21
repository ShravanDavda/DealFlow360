import axios from 'axios';

const getApiBaseUrl = () => {
  let url = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!url) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      url = 'https://dealflow360-backend-48n8.onrender.com/api';
    } else {
      url = 'http://localhost:5000/api';
    }
  }
  url = url.replace(/\/$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      status: error.response?.status || 500,
      message: error.response?.data?.message || error.message || 'Something went wrong. Please try again.',
      data: error.response?.data || null,
    };
    return Promise.reject(customError);
  }
);

export default api;
