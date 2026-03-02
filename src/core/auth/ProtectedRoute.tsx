/**
 * Protected Route Component
 * Guards authenticated routes and redirects to login if not authenticated
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, organization } = useAuth();

  // Debug logging
  console.log('ProtectedRoute:', { isLoading, isAuthenticated, hasOrg: !!organization });

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: '1.2rem',
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/" replace />;
  }

  // Render protected content
  return <>{children}</>;
};
