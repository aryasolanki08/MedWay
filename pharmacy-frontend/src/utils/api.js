import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8001';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Never attach a stale/expired token to endpoints that don't need one --
// DRF's JWTAuthentication runs (and can reject) before the view's own
// AllowAny permission is even checked, so a bad token can break login
// itself, not just authenticated routes.
const PUBLIC_PATHS = ['/api/auth/token/', '/api/auth/token/refresh/', '/api/auth/signup/', '/api/auth/google/'];

// Request interceptor to add bearer token
api.interceptors.request.use(
  (config) => {
    if (PUBLIC_PATHS.some((path) => config.url?.startsWith(path))) return config;
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle expired tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/api/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          const newAccess = res.data.access;
          localStorage.setItem('access_token', newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (refreshErr) {
          // Token refresh failed - clear storage
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
