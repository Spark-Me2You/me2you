/**
 * Admin Authentication Service
 * Handles authentication for admin users via email/password
 */

import { supabase } from './client';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Admin User Interface
 * Represents an admin record from the database
 */
export interface AdminUser {
  id: string;
  email: string;
  org_id: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Admin Auth Service
 * Handles authentication for admin users via email/password
 */
export const adminAuthService = {
  /**
   * Sign in admin with email and password
   *
   * Steps:
   * 1. Authenticate with Supabase using email/password
   * 2. Verify the authenticated user exists
   * 3. Query the 'admin' table to verify the user is an admin
   * 4. If no admin record found, sign out and throw error
   * 5. Return user, admin data, and session
   *
   * @param email - Admin email address
   * @param password - Admin password
   * @returns Promise with user, admin data, and session
   * @throws Error if authentication fails or user is not an admin
   */
  signInWithEmail: async (email: string, password: string): Promise<{ user: User; admin: AdminUser; session: Session }> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!authData.user || !authData.session) {
      throw new Error('No user or session returned from authentication');
    }

    // The account must also have a row in the admin table
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (adminError || !adminData) {
      // Clean up the session since this user is not an admin
      await supabase.auth.signOut({ scope: 'local' });

      // The login page shows this message, so keep it generic and log the detail.
      console.error(
        '[adminAuth] Admin verification failed:',
        adminError ? `${adminError.message} (${adminError.code})` : 'no admin record for this account',
      );
      throw new Error("This account doesn't have admin access.");
    }

    return {
      user: authData.user,
      admin: adminData as AdminUser,
      session: authData.session,
    };
  },

  /**
   * Get current admin session
   *
   * Steps:
   * 1. Get the current session from Supabase (checks localStorage)
   * 2. If no session exists, return null
   * 3. Query the 'admin' table to verify the user is an admin
   * 4. If no admin record found, return null
   * 5. Return user, admin data, and session
   *
   * @returns Promise with current admin session or null
   */
  getCurrentAdmin: async (): Promise<{ user: User; admin: AdminUser; session: Session } | null> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        return null;
      }

      if (!session) {
        return null;
      }

      // Verify the user is in the admin table
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (adminError) {
        return null;
      }

      if (!adminData) {
        return null;
      }

      return {
        user: session.user,
        admin: adminData as AdminUser,
        session,
      };
    } catch (error) {
      console.error('[adminAuth] Unexpected error in getCurrentAdmin:', error);
      return null;
    }
  },

  /**
   * Sign out current admin
   *
   * Steps:
   * 1. Call supabase.auth.signOut() to clear the session
   * 2. Throw error if sign out fails
   *
   * @throws Error if sign out fails
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  },

  /**
   * Listen to authentication state changes
   *
   * Subscribes to Supabase auth events:
   * - SIGNED_IN: User signed in
   * - SIGNED_OUT: User signed out
   * - TOKEN_REFRESHED: Session token was refreshed
   * - USER_UPDATED: User data was updated
   * - PASSWORD_RECOVERY: Password recovery initiated
   *
   * @param callback - Function to call when auth state changes
   * @returns Subscription object with unsubscribe method
   */
  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};
