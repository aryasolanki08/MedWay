import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client";
import { setTokens, getAccess, clearTokens } from "../utils/tokenStorage.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const { data } = await client.get("/auth/profile/");
      setUser(data);
    } catch {
      // Token is unusable (expired, or -- as after a full DB reset --
      // refers to a user that no longer exists). Clear it so it doesn't
      // keep silently failing on every future reload.
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getAccess()) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password, remember = true) => {
    const { data } = await client.post("/auth/login/", { username, password });
    setTokens(data.access, data.refresh, remember);
    await loadProfile();
  };

  const register = async (payload) => {
    const { data } = await client.post("/auth/register/", payload);
    setTokens(data.access, data.refresh, true);
    setUser(data.user);
  };

  const loginWithGoogle = async (credential, remember = true) => {
    const { data } = await client.post("/auth/google/", { credential });
    setTokens(data.access, data.refresh, remember);
    setUser(data.user);
  };

  const logout = () => {
    clearTokens();
    localStorage.removeItem("medway_cart"); // don't leak one user's cart into the next login
    setUser(null);
  };

  const updateProfile = async (payload) => {
    const { data } = await client.patch("/auth/profile/", payload);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
