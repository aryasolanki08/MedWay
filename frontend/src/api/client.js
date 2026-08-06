import axios from "axios";
import { getAccess, getRefresh, setAccess, clearTokens } from "../utils/tokenStorage.js";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const client = axios.create({ baseURL: API_BASE });

// Never attach a stale/expired token to endpoints that don't need one.
// A stray Authorization header here doesn't just get ignored -- DRF's
// JWTAuthentication runs (and can reject) before the view's own
// permission_classes (e.g. AllowAny on login/register/google) are even
// checked, so an invalid token can break login itself, not just
// authenticated routes.
const PUBLIC_PATHS = ["/auth/login/", "/auth/register/", "/auth/google/", "/auth/refresh/"];

client.interceptors.request.use((config) => {
  if (PUBLIC_PATHS.some((path) => config.url?.startsWith(path))) return config;
  const token = getAccess();
  // NOTE: for a production build, prefer an httpOnly cookie set by the
  // backend over localStorage to reduce XSS exposure of the JWT.
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = getRefresh();
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh/`, { refresh });
          setAccess(data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return client(original);
        } catch {
          clearTokens();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
