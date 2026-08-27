import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

const client = axios.create({ baseURL: API_BASE_URL });

// Attach the stored JWT (if any) to every request. Endpoints that don't
// require auth (upload/forecast/eda) just ignore it; /auth/me requires it.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
