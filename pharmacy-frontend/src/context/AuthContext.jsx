import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/auth/me/');
      setUser(res.data);
    } catch (err) {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/token/', { username, password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      await fetchProfile();
      return { success: true };
    } catch (err) {
      setLoading(false);
      return {
        success: false,
        error: err.response?.data?.detail || 'Invalid username or password.',
      };
    }
  };

  const signup = async (signupData) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/signup/', signupData);
      localStorage.setItem('access_token', res.data.tokens.access);
      localStorage.setItem('refresh_token', res.data.tokens.refresh);
      await fetchProfile();
      return { success: true };
    } catch (err) {
      setLoading(false);
      return {
        success: false,
        error: err.response?.data || { message: 'Signup failed. Please try again.' },
      };
    }
  };

  // Single endpoint handles both Google login and the start/completion of
  // Google-based signup (see backend accounts.views.GoogleAuthView). Called
  // with just a credential first; if the account doesn't exist yet, the
  // backend replies with `signup_required` instead of tokens, and the
  // caller re-calls this with pharmacyFields once the user fills them in.
  const authenticateWithGoogle = async (credential, pharmacyFields = null) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/google/', { credential, ...pharmacyFields });
      if (res.data.signup_required) {
        setLoading(false);
        return { success: false, signupRequired: true, email: res.data.email, name: res.data.name };
      }
      localStorage.setItem('access_token', res.data.tokens.access);
      localStorage.setItem('refresh_token', res.data.tokens.refresh);
      await fetchProfile();
      return { success: true };
    } catch (err) {
      setLoading(false);
      return {
        success: false,
        error: err.response?.data?.detail || err.response?.data || 'Google sign-in failed.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, authenticateWithGoogle, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
