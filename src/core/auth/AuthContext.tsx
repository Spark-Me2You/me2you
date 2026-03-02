/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/core/supabase/auth';
import type { Database } from '@/core/supabase/client';

type Organization = Database['public']['Tables']['organization']['Row'];
type User = Database['public']['Tables']['user']['Row'];

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isOrgAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      console.log('[AuthContext] Checking for existing session...');
      try {
        const session = await authService.getCurrentSession();

        if (!isMounted) {
          console.log('[AuthContext] Component unmounted, skipping session update');
          return;
        }

        if (session) {
          console.log('[AuthContext] Session found:', {
            userId: session.user?.id || 'null',
            orgId: session.organization.id
          });
          setUser(session.user);
          setOrganization(session.organization);
          setIsOrgAdmin(session.isOrgAdmin);
        } else {
          console.log('[AuthContext] No existing session');
        }
      } catch (error) {
        console.error('[AuthContext] Error checking session:', error);
      } finally {
        if (isMounted) {
          console.log('[AuthContext] Session check complete, setting isLoading=false');
          setIsLoading(false);
        }
      }
    };

    checkSession();

    // Listen for auth changes
    console.log('[AuthContext] Setting up auth state change listener');
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event) => {
        console.log('[AuthContext] Auth state changed:', event);

        if (!isMounted) {
          console.log('[AuthContext] Component unmounted, ignoring auth state change');
          return;
        }

        if (event === 'SIGNED_IN') {
          try {
            const session = await authService.getCurrentSession();
            if (session && isMounted) {
              console.log('[AuthContext] SIGNED_IN - updating state with session data');
              setUser(session.user);
              setOrganization(session.organization);
              setIsOrgAdmin(session.isOrgAdmin);
            }
          } catch (error) {
            console.error('[AuthContext] Error fetching session after sign in:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] SIGNED_OUT - clearing auth state');
          setUser(null);
          setOrganization(null);
          setIsOrgAdmin(false);
        }
      }
    );

    return () => {
      console.log('[AuthContext] Cleaning up auth state listener');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] signIn called for:', email);
    try {
      const result = await authService.signInWithEmail(email, password);
      console.log('[AuthContext] signIn result:', { success: result.success, hasData: !!result.data });

      if (result.success && result.data) {
        console.log('[AuthContext] Updating auth state after successful login');
        setUser(result.data.user);
        setOrganization(result.data.organization);
        setIsOrgAdmin(result.data.isOrgAdmin);
      }
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('[AuthContext] Unexpected error in signIn:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setOrganization(null);
    setIsOrgAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isOrgAdmin,
        isLoading,
        isAuthenticated: !!organization, // Only require org for admin auth
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
