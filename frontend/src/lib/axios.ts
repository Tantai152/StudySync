import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  withCredentials: true, // Important for sending cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;