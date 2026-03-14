/**
 * Auth Provider
 * Manages authentication state and provides auth context to the app
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { adminAuthService, type AdminUser } from '@/core/supabase/auth';
import type { User, Session } from '@supabase/supabase-js';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state and methods
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize authentication on mount
   * TODO: This checks for an existing session when the app loads
   * Currently returns null because adminAuthService.getCurrentAdmin is not implemented
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // TODO: This will check if there's an existing session in localStorage
        const adminSession = await adminAuthService.getCurrentAdmin();

        if (adminSession) {
          setUser(adminSession.user);
          setAdmin(adminSession.admin);
          setSession(adminSession.session);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    /**
     * Subscribe to auth state changes
     * TODO: This listens for auth events like SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
     * Currently returns a mock subscription because onAuthStateChange is not implemented
     */
    const { data: { subscription } } = adminAuthService.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);

        // TODO: Handle different auth events
        if (event === 'SIGNED_OUT') {
          // Clear auth state when user signs out
          setUser(null);
          setAdmin(null);
          setSession(null);
        } else if (event === 'SIGNED_IN' && newSession) {
          // Re-fetch admin data when user signs in
          const adminSession = await adminAuthService.getCurrentAdmin();
          if (adminSession) {
            setUser(adminSession.user);
            setAdmin(adminSession.admin);
            setSession(adminSession.session);
          }
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          // Update session when token is refreshed
          setSession(newSession);
        }
      }
    );

    // Cleanup: Unsubscribe when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in admin with email and password
   *
   * TODO: This calls the adminAuthService.signInWithEmail method
   * Currently throws an error because the service is not implemented
   */
  const signIn = async (email: string, password: string) => {
    try {
      // TODO: Call adminAuthService.signInWithEmail
      // This will authenticate with Supabase and verify admin status
      const result = await adminAuthService.signInWithEmail(email, password);

      // Update local state with authenticated user
      setUser(result.user);
      setAdmin(result.admin);
      setSession(result.session);
    } catch (error) {
      // Re-throw error to be handled by the login page
      throw error;
    }
  };

  /**
   * Sign out current admin
   *
   * TODO: This calls the adminAuthService.signOut method
   * Currently throws an error because the service is not implemented
   */
  const signOut = async () => {
    try {
      // TODO: Call adminAuthService.signOut
      // This will sign out from Supabase
      await adminAuthService.signOut();

      // Clear local auth state
      setUser(null);
      setAdmin(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      // Re-throw error to be handled by the UI
      throw error;
    }
  };

  /**
   * Memoized context value
   * Prevents unnecessary re-renders of consuming components
   */
  const value = useMemo(
    () => ({
      user,
      admin,
      session,
      isLoading,
      isAuthenticated: !!session && !!admin,
      signIn,
      signOut,
    }),
    [user, admin, session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
