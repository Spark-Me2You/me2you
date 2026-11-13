/**
 * Auth Provider
 * Manages authentication state and provides auth context to the app
 * Supports both admin and kiosk authentication modes
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AuthContext, type AuthMode, type UserProfile } from './AuthContext';
import { adminAuthService, type AdminUser } from '@/core/supabase/adminAuth';
import { kioskAuthService } from '@/core/supabase/kioskAuth';
import { userRegistrationAuthService } from '@/core/supabase/userRegistrationAuth';
import type { User, Session } from '@supabase/supabase-js';

interface AuthProviderProps {
  children: React.ReactNode;
}

const SIGN_OUT_TIMEOUT_MS = 5000;

const withTimeout = async <T,>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
};

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state and methods
 * Manages both admin and kiosk authentication modes
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('unauthenticated');
  const [kioskOrgId, setKioskOrgId] = useState<string | null>(null);

  /**
   * Initialize authentication on mount
   * Checks for an existing session when the app loads
   * Detects whether it's an admin or kiosk session based on JWT metadata
   */
  useEffect(() => {
    let isMounted = true;
    let isInitializing = true;

    const initializeAuth = async () => {
      let detectedMode: AuthMode = 'unauthenticated';
      try {

        // First, check if there's a kiosk session
        const kioskSession = await kioskAuthService.getCurrentKioskSession();

        if (kioskSession) {
          // Kiosk session found
          if (isMounted) {
            setUser(kioskSession.user);
            setSession(kioskSession.session);
            setKioskOrgId(kioskSession.org_id);
            detectedMode = 'kiosk';
            setAuthMode(detectedMode);
            setAdmin(null); // No admin in kiosk mode
          }
        } else {
          // Check for admin session
          const adminSession = await adminAuthService.getCurrentAdmin();

          if (adminSession) {
            if (isMounted) {
              setUser(adminSession.user);
              setAdmin(adminSession.admin);
              setSession(adminSession.session);
              detectedMode = 'admin';
              setAuthMode(detectedMode);
              setKioskOrgId(null); // No org in admin mode
            }
          } else {
            // Check for regular user session
            const userSession = await userRegistrationAuthService.getCurrentSession();

            if (userSession) {
              // User is authenticated, check if they have a profile
              const profile = await userRegistrationAuthService.getCurrentUserProfile();

              if (isMounted) {
                setUser(userSession.user);
                setSession(userSession);
                setUserProfileState(profile);
                detectedMode = 'user';
                setAuthMode(detectedMode);
              }
            } else {
              if (isMounted) {
                detectedMode = 'unauthenticated';
                setAuthMode(detectedMode);
              }
            }
          }
        }
      } catch (error) {
        console.error('[AuthProvider] Failed to initialize auth:', error);
        // Clear auth state on error
        if (isMounted) {
          setUser(null);
          setAdmin(null);
          setUserProfileState(null);
          setSession(null);
          detectedMode = 'unauthenticated';
          setAuthMode(detectedMode);
          setKioskOrgId(null);
        }
      } finally {
        if (isMounted) {
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

        // Skip events during initialization to avoid duplicate fetches
        if (isInitializing) {
          return;
        }

        if (!isMounted) return;

        try {
          if (event === 'SIGNED_OUT') {
            // Clear auth state when user signs out
            setUser(null);
            setAdmin(null);
            setUserProfileState(null);
            setSession(null);
            setAuthMode('unauthenticated');
            setKioskOrgId(null);
          } else if (event === 'SIGNED_IN' && newSession) {
            // Determine if this is an admin or kiosk sign-in based on JWT metadata

            // Kiosk claims are stored in app_metadata (set by edge function)
            const { is_kiosk, org_id } = newSession.user.app_metadata || {};

            if (is_kiosk && org_id) {
              // Kiosk session
              if (isMounted) {
                setUser(newSession.user);
                setSession(newSession);
                setKioskOrgId(org_id);
                setAuthMode('kiosk');
                setAdmin(null);
                setUserProfileState(null);
              }
            } else {
              // Check if admin session - verify admin table
              const adminSession = await adminAuthService.getCurrentAdmin();
              if (adminSession && isMounted) {
                setUser(adminSession.user);
                setAdmin(adminSession.admin);
                setSession(adminSession.session);
                setAuthMode('admin');
                setKioskOrgId(null);
                setUserProfileState(null);
              } else if (isMounted) {
                // Not admin, must be regular user (mobile registration)
                setUser(newSession.user);
                setSession(newSession);
                setAuthMode('user');
                setAdmin(null);
                setKioskOrgId(null);
                // Profile will be set later via setUserProfile
              }
            }
          } else if (event === 'TOKEN_REFRESHED' && newSession) {
            // Update session when token is refreshed
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
   */
  const signIn = async (email: string, password: string) => {
    // Errors propagate to the login page
    const result = await adminAuthService.signInWithEmail(email, password);

    // Update local state with authenticated admin
    setUser(result.user);
    setAdmin(result.admin);
    setSession(result.session);
    setAuthMode('admin');
    setKioskOrgId(null);
  };

  /**
   * Sign out current user (admin or kiosk)
   */
  const signOut = async () => {
    const modeAtSignOut = authMode;

    try {
      if (modeAtSignOut === 'admin') {
        await withTimeout(adminAuthService.signOut(), SIGN_OUT_TIMEOUT_MS, 'Admin sign out');
      } else if (modeAtSignOut === 'kiosk') {
        await withTimeout(kioskAuthService.exitKioskMode(), SIGN_OUT_TIMEOUT_MS, 'Kiosk sign out');
      } else if (modeAtSignOut === 'user') {
        await withTimeout(userRegistrationAuthService.signOut(), SIGN_OUT_TIMEOUT_MS, 'User sign out');
      }
    } catch (error) {
      console.warn('[AuthProvider] Remote sign out did not complete cleanly:', error);
    } finally {
      // Always clear local auth state so logout UX doesn't depend on network/storage latency.
      setUser(null);
      setAdmin(null);
      setUserProfileState(null);
      setSession(null);
      setAuthMode('unauthenticated');
      setKioskOrgId(null);
    }
  };

  /**
   * Mint a kiosk session for the given organization
   * This transitions from admin mode to kiosk mode
   */
  const mintKioskSession = async (orgId: string) => {
    try {

      // Call kiosk auth service to mint session
      // This will:
      // 1. Call edge function
      // 2. Sign out admin
      // 3. Sign in as kiosk user
      const kioskSession = await kioskAuthService.mintKioskSession(orgId);

      // Update local state with kiosk session

      setUser(kioskSession.user);
      setSession(kioskSession.session);
      setKioskOrgId(kioskSession.org_id);
      setAuthMode('kiosk');
      setAdmin(null); // Clear admin state

    } catch (error) {
      console.error('[AuthProvider] Failed to mint kiosk session:', error);
      // Re-throw error to be handled by the UI
      throw error;
    }
  };

  /**
   * Exit kiosk mode and return to unauthenticated state
   */
  const exitKioskMode = async () => {
    try {

      await kioskAuthService.exitKioskMode();

      // Clear all auth state
      setUser(null);
      setAdmin(null);
      setUserProfileState(null);
      setSession(null);
      setAuthMode('unauthenticated');
      setKioskOrgId(null);

    } catch (error) {
      console.error('[AuthProvider] Failed to exit kiosk mode:', error);
      // Re-throw error to be handled by the UI
      throw error;
    }
  };

  /**
   * Sign up a new user with email and password
   * Used for mobile registration flow
   */
  const signUpUser = useCallback(async (email: string, password: string): Promise<User> => {
    try {

      const result = await userRegistrationAuthService.signUp(email, password);

      // Update local state with authenticated user
      setUser(result.user);
      setSession(result.session);
      setAuthMode('user');
      setAdmin(null);
      setKioskOrgId(null);

      return result.user;
    } catch (error) {
      console.error('[AuthProvider] User signup failed:', error);
      throw error;
    }
  }, []);

  /**
   * Sign in an existing user with email and password
   * Used for mobile user sign-in
   */
  const signInUser = useCallback(async (email: string, password: string): Promise<void> => {
    try {

      const result = await userRegistrationAuthService.signIn(email, password);

      // Fetch user profile
      const profile = await userRegistrationAuthService.getCurrentUserProfile();

      // Update local state with authenticated user
      setUser(result.user);
      setSession(result.session);
      setUserProfileState(profile);
      setAuthMode('user');
      setAdmin(null);
      setKioskOrgId(null);
    } catch (error) {
      console.error('[AuthProvider] User sign in failed:', error);
      throw error;
    }
  }, []);

  /**
   * Set the user profile after registration is complete
   */
  const setUserProfile = useCallback((profile: UserProfile) => {
    setUserProfileState(profile);
  }, []);

  /**
   * Memoized context value
   * Prevents unnecessary re-renders of consuming components
   */
  const value = useMemo(
    () => ({
      user,
      admin,
      userProfile,
      session,
      isLoading,
      isAuthenticated: !!session,
      authMode,
      kioskOrgId,
      signIn,
      signOut,
      mintKioskSession,
      exitKioskMode,
      signUpUser,
      signInUser,
      setUserProfile,
    }),
    [user, admin, userProfile, session, isLoading, authMode, kioskOrgId, signUpUser, signInUser, setUserProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
