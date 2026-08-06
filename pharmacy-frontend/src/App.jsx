import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Providers
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import History from './pages/History';
import Orders from './pages/Orders';
import Settings from './pages/Settings';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/billing" element={<Billing />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/purchases" element={<Purchases />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/settings" element={<Settings />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
