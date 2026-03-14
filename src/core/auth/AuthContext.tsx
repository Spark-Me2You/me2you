/**
 * Auth Context
 * Provides authentication state and methods throughout the app
 */

import { createContext, useContext } from 'react';
import type { AdminUser } from '@/core/supabase/adminAuth';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Auth Mode Type
 * Represents the current authentication mode
 */
export type AuthMode = 'admin' | 'kiosk' | 'unauthenticated';

/**
 * Auth Context Type
 * Defines the shape of the authentication context
 */
export interface AuthContextType {
  /**
   * Authenticated Supabase user object (from auth.users table)
   */
  user: User | null;

  /**
   * Admin data from the admin table
   * Only populated when authMode is 'admin'
   */
  admin: AdminUser | null;

  /**
   * Current Supabase session
   */
  session: Session | null;

  /**
   * Whether auth state is currently being loaded
   */
  isLoading: boolean;

  /**
   * Whether user is authenticated (admin or kiosk mode)
   * True if a valid session exists
   */
  isAuthenticated: boolean;

  /**
   * Current authentication mode
   * - 'admin': Authenticated as admin with full access
   * - 'kiosk': Authenticated as kiosk user with read-only access to specific org
   * - 'unauthenticated': Not authenticated
   */
  authMode: AuthMode;

  /**
   * Organization ID for kiosk sessions
   * Only populated when authMode is 'kiosk'
   */
  kioskOrgId: string | null;

  /**
   * Sign in admin with email and password
   * @param email - Admin email
   * @param password - Admin password
   * @throws Error if authentication fails
   */
  signIn: (email: string, password: string) => Promise<void>;

  /**
   * Sign out current user (admin or kiosk)
   * @throws Error if sign out fails
   */
  signOut: () => Promise<void>;

  /**
   * Mint a kiosk session for the given organization
   * This will:
   * 1. Call edge function to mint kiosk session
   * 2. Sign out admin
   * 3. Sign in as kiosk user with org_id in JWT
   * 4. Transition authMode to 'kiosk'
   *
   * @param orgId - Organization ID to scope the kiosk session to
   * @throws Error if minting fails
   */
  mintKioskSession: (orgId: string) => Promise<void>;

  /**
   * Exit kiosk mode and return to unauthenticated state
   * @throws Error if exit fails
   */
  exitKioskMode: () => Promise<void>;
}

/**
 * Auth Context
 * React context for authentication state
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * useAuth Hook
 * Access authentication context from any component
 *
 * @returns Auth context
 * @throws Error if used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
