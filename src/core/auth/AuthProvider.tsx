/**
 * Auth Provider
 * Manages authentication state and provides auth context to the app
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { adminAuthService, type AdminUser } from '@/core/supabase/adminAuth';
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
   * Checks for an existing session when the app loads
   */
  useEffect(() => {
    let isMounted = true;
    let isInitializing = true;

    const initializeAuth = async () => {
      try {
        console.log('[AuthProvider] Initializing auth...');
        const adminSession = await adminAuthService.getCurrentAdmin();

        if (isMounted) {
          if (adminSession) {
            console.log('[AuthProvider] Found existing admin session:', adminSession.admin.email);
            setUser(adminSession.user);
            setAdmin(adminSession.admin);
            setSession(adminSession.session);
          } else {
            console.log('[AuthProvider] No existing session found');
          }
        }
      } catch (error) {
        console.error('[AuthProvider] Failed to initialize auth:', error);
        // Clear auth state on error
        if (isMounted) {
          setUser(null);
          setAdmin(null);
          setSession(null);
        }
      } finally {
        if (isMounted) {
          console.log('[AuthProvider] Auth initialization complete');
          setIsLoading(false);
          isInitializing = false;
        }
      }
    };

    // Start initialization
    initializeAuth();

    /**
     * Subscribe to auth state changes
     * Listens for auth events like SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
     *
     * NOTE: onAuthStateChange fires immediately with current state on subscribe.
     * We skip handling this initial event to avoid duplicate calls during initialization.
     */
    const { data: { subscription } } = adminAuthService.onAuthStateChange(
      async (event, newSession) => {
        console.log('[AuthProvider] Auth state changed:', event, newSession ? 'session exists' : 'no session');

        // Skip events during initialization to avoid duplicate fetches
        if (isInitializing) {
          console.log('[AuthProvider] Skipping event during initialization');
          return;
        }

        if (!isMounted) return;

        try {
          if (event === 'SIGNED_OUT') {
            // Clear auth state when user signs out
            console.log('[AuthProvider] User signed out, clearing state');
            setUser(null);
            setAdmin(null);
            setSession(null);
          } else if (event === 'SIGNED_IN' && newSession) {
            // Re-fetch admin data when user signs in (after login)
            console.log('[AuthProvider] User signed in, fetching admin data...');
            const adminSession = await adminAuthService.getCurrentAdmin();
            if (adminSession && isMounted) {
              console.log('[AuthProvider] Admin data fetched:', adminSession.admin.email);
              setUser(adminSession.user);
              setAdmin(adminSession.admin);
              setSession(adminSession.session);
            }
          } else if (event === 'TOKEN_REFRESHED' && newSession) {
            // Update session when token is refreshed
            console.log('[AuthProvider] Token refreshed');
            setSession(newSession);
          }
        } catch (error) {
          console.error('[AuthProvider] Error handling auth state change:', error);
        }
      }
    );

    // Cleanup: Unsubscribe when component unmounts
    return () => {
      isMounted = false;
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
