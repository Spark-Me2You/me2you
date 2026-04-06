/**
 * User Protected Route Component
 * Wraps routes that require user authentication (mobile users)
 * Redirects to /user landing page if not authenticated as user
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface UserProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * User Protected Route
 * Checks if user is authenticated as a mobile user before rendering children
 * Shows loading state while checking authentication
 * Redirects to /user if not authenticated or if authenticated as admin/kiosk
 *
 * Note: Admin and kiosk auth modes are NOT allowed to access user routes.
 * Only 'user' mode can access mobile user views like /user/profile.
 */
export const UserProtectedRoute: React.FC<UserProtectedRouteProps> = ({ children }) => {
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
          background: 'linear-gradient(to bottom, #58e7f7 0%, #fefffb 100%)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontFamily: '"Jersey 10", sans-serif',
              fontSize: '32px',
              color: '#333',
            }}
          >
            loading...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to /user landing page if not authenticated as user
  if (!isAuthenticated || authMode !== 'user') {
    return <Navigate to="/user" replace />;
  }

  // Render children if authenticated as user
  return <>{children}</>;
};
