import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '@antigravity/shared';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: Role;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-500">Loading Inspection session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect to proper role dashboard
    return <Navigate to={user.role === 'MANAGER' ? '/manager/dashboard' : '/employee/dashboard'} replace />;
  }

  return children;
};
