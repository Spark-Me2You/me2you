/**
 * Protected Route Component
 * Wraps routes that require authentication
 * Redirects to login page if user is not authenticated
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route
 * Checks if user is authenticated as admin or kiosk before rendering children
 * Shows loading state while checking authentication
 * Redirects to /login if not authenticated or if authenticated as regular user
 *
 * Note: Regular 'user' auth mode (mobile registration) is NOT allowed to access
 * protected routes. Only 'admin' and 'kiosk' modes can access /app.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, authMode } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to login if authenticated as regular user (not admin/kiosk)
  // Regular users from mobile registration should not access the main app
  if (authMode === 'user') {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated as admin or kiosk
  return <>{children}</>;
};
