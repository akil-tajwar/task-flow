import axios from 'axios';
import { setBackendReachable } from './connectivity';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const api = axios.create({ baseURL: API_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    // Any successful response means the backend is reachable
    setBackendReachable(true);
    return res;
  },
  async (err) => {
    // No response at all = network error = backend unreachable
    if (!err.response && typeof window !== 'undefined') {
      setBackendReachable(false);
    }

    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          err.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(err.config);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);
