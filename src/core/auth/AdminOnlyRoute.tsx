/**
 * Admin-Only Route Guard
 *
 * Protects routes that should only be accessible to authenticated admins.
 * Redirects to /login if not authenticated.
 * Redirects to /app if authenticated as kiosk (not admin).
 *
 * Use this for pages like organization selector that require admin privileges.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { FC, ReactNode } from 'react';

interface AdminOnlyRouteProps {
  children: ReactNode;
}

/**
 * AdminOnlyRoute Component
 *
 * Renders children only if authenticated as admin.
 * Shows loading spinner while auth state is loading.
 * Redirects to /login if not authenticated.
 * Redirects to /app if authenticated as kiosk.
 */
export const AdminOnlyRoute: FC<AdminOnlyRouteProps> = ({ children }) => {
  const { isLoading, isAuthenticated, authMode } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    console.log('[AdminOnlyRoute] Not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // Authenticated but not as admin (kiosk mode) - redirect to app
  if (authMode !== 'admin') {
    console.log('[AdminOnlyRoute] Not in admin mode (mode:', authMode, '), redirecting to /app');
    return <Navigate to="/app" replace />;
  }

  // Authenticated as admin - render children
  console.log('[AdminOnlyRoute] Admin authenticated, rendering protected content');
  return <>{children}</>;
};
