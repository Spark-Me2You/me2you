/**
 * User Protected Route Component
 * Wraps routes that require user authentication (mobile users)
 * Redirects to /user landing page if not authenticated as user
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingText } from '@/shared/components/LoadingText';
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
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-page-gradient">
        <LoadingText className="text-[32px]" />
      </div>
    );
  }

  // Redirect to /user landing page if not authenticated as user
  if (!isAuthenticated || authMode !== 'user') {
    // Come back here after signing in (UserLandingPage reads ?next=).
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/user?next=${next}`} replace />;
  }

  // Render children if authenticated as user
  return <>{children}</>;
};
