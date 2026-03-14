/**
 * Auth Context
 * Provides authentication state and methods throughout the app
 */

import { createContext, useContext } from 'react';
import type { AdminUser } from '@/core/supabase/adminAuth';
import type { User, Session } from '@supabase/supabase-js';

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
   * Whether user is authenticated and verified as admin
   * True only if both session exists AND admin record exists
   */
  isAuthenticated: boolean;

  /**
   * Sign in admin with email and password
   * @param email - Admin email
   * @param password - Admin password
   * @throws Error if authentication fails
   */
  signIn: (email: string, password: string) => Promise<void>;

  /**
   * Sign out current admin
   * @throws Error if sign out fails
   */
  signOut: () => Promise<void>;
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
