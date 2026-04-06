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
        console.log('[AuthProvider] Initializing auth...');

        // First, check if there's a kiosk session
        const kioskSession = await kioskAuthService.getCurrentKioskSession();

        if (kioskSession) {
          // Kiosk session found
          if (isMounted) {
            console.log('[AuthProvider] Found existing kiosk session for org:', kioskSession.org_id);
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
              console.log('[AuthProvider] Found existing admin session:', adminSession.admin.email);
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
                console.log('[AuthProvider] Found existing user session:', userSession.user.id);
                setUser(userSession.user);
                setSession(userSession);
                setUserProfileState(profile);
                detectedMode = 'user';
                setAuthMode(detectedMode);
              }
            } else {
              if (isMounted) {
                console.log('[AuthProvider] No existing session found');
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
          console.log('[AuthProvider] Auth initialization complete. Mode:', detectedMode);
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
            setUserProfileState(null);
            setSession(null);
            setAuthMode('unauthenticated');
            setKioskOrgId(null);
          } else if (event === 'SIGNED_IN' && newSession) {
            // Determine if this is an admin or kiosk sign-in based on JWT metadata
            console.log('[AuthProvider] User signed in, determining auth mode...');

            // Kiosk claims are stored in app_metadata (set by edge function)
            const { is_kiosk, org_id } = newSession.user.app_metadata || {};

            if (is_kiosk && org_id) {
              // Kiosk session
              console.log('[AuthProvider] Kiosk session detected for org:', org_id);
              if (isMounted) {
                setUser(newSession.user);
                setSession(newSession);
                setKioskOrgId(org_id);
                setAuthMode('kiosk');
                setAdmin(null);
                setUserProfileState(null);
                console.log('[AuthProvider] Auth mode changed: kiosk');
              }
            } else {
              // Check if admin session - verify admin table
              console.log('[AuthProvider] Checking if admin or user session...');
              const adminSession = await adminAuthService.getCurrentAdmin();
              if (adminSession && isMounted) {
                console.log('[AuthProvider] Admin data fetched:', adminSession.admin.email);
                setUser(adminSession.user);
                setAdmin(adminSession.admin);
                setSession(adminSession.session);
                setAuthMode('admin');
                setKioskOrgId(null);
                setUserProfileState(null);
                console.log('[AuthProvider] Auth mode changed: admin');
              } else if (isMounted) {
                // Not admin, must be regular user (mobile registration)
                console.log('[AuthProvider] User session detected');
                setUser(newSession.user);
                setSession(newSession);
                setAuthMode('user');
                setAdmin(null);
                setKioskOrgId(null);
                // Profile will be set later via setUserProfile
                console.log('[AuthProvider] Auth mode changed: user');
              }
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
   */
  const signIn = async (email: string, password: string) => {
    try {
      const result = await adminAuthService.signInWithEmail(email, password);

      // Update local state with authenticated admin
      console.log('[AuthProvider] Admin signed in:', result.admin.email);
      setUser(result.user);
      setAdmin(result.admin);
      setSession(result.session);
      setAuthMode('admin');
      setKioskOrgId(null);
    } catch (error) {
      // Re-throw error to be handled by the login page
      throw error;
    }
  };

  /**
   * Sign out current user (admin or kiosk)
   */
  const signOut = async () => {
    try {
      console.log('[AuthProvider] Signing out from mode:', authMode);

      if (authMode === 'admin') {
        await adminAuthService.signOut();
        console.log('[AuthProvider] Admin signed out');
      } else if (authMode === 'kiosk') {
        await kioskAuthService.exitKioskMode();
        console.log('[AuthProvider] Kiosk session ended');
      } else if (authMode === 'user') {
        await userRegistrationAuthService.signOut();
        console.log('[AuthProvider] User signed out');
      }

      // Clear local auth state
      setUser(null);
      setAdmin(null);
      setUserProfileState(null);
      setSession(null);
      setAuthMode('unauthenticated');
      setKioskOrgId(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      // Re-throw error to be handled by the UI
      throw error;
    }
  };

  /**
   * Mint a kiosk session for the given organization
   * This transitions from admin mode to kiosk mode
   */
  const mintKioskSession = async (orgId: string) => {
    try {
      console.log('[AuthProvider] Minting kiosk session for org:', orgId);

      // Call kiosk auth service to mint session
      // This will:
      // 1. Call edge function
      // 2. Sign out admin
      // 3. Sign in as kiosk user
      const kioskSession = await kioskAuthService.mintKioskSession(orgId);

      // Update local state with kiosk session
      console.log('[AuthProvider] Kiosk session minted for org:', kioskSession.org_id);
      console.log('[AuthProvider] Kiosk user ID:', kioskSession.user.id);
      console.log('[AuthProvider] Kiosk token in app_metadata:', JSON.stringify(kioskSession.user.app_metadata));

      setUser(kioskSession.user);
      setSession(kioskSession.session);
      setKioskOrgId(kioskSession.org_id);
      setAuthMode('kiosk');
      setAdmin(null); // Clear admin state

      console.log('[AuthProvider] Auth mode changed: kiosk');
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
      console.log('[AuthProvider] Exiting kiosk mode');

      await kioskAuthService.exitKioskMode();

      // Clear all auth state
      setUser(null);
      setAdmin(null);
      setUserProfileState(null);
      setSession(null);
      setAuthMode('unauthenticated');
      setKioskOrgId(null);

      console.log('[AuthProvider] Kiosk mode exited');
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
      console.log('[AuthProvider] Signing up user:', email);

      const result = await userRegistrationAuthService.signUp(email, password);

      // Update local state with authenticated user
      console.log('[AuthProvider] User signed up:', result.user.id);
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
      console.log('[AuthProvider] Signing in user:', email);

      const result = await userRegistrationAuthService.signIn(email, password);

      // Fetch user profile
      const profile = await userRegistrationAuthService.getCurrentUserProfile();

      // Update local state with authenticated user
      console.log('[AuthProvider] User signed in:', result.user.id);
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
    console.log('[AuthProvider] Setting user profile:', profile.name);
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
