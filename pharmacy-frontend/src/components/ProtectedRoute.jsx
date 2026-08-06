import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          {/* Loading Skeleton */}
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400 animate-pulse text-sm font-medium">
            Loading MedWay...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
