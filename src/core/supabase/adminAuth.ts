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
    // Step 1: Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Step 2: Handle authentication errors
    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!authData.user || !authData.session) {
      throw new Error('No user or session returned from authentication');
    }

    // Step 3: Verify user is in admin table
    console.log('Checking admin status for user ID:', authData.user.id);

    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    console.log('Admin query result:', { adminData, adminError });

    // Step 4: If not an admin, sign out and throw error
    if (adminError || !adminData) {
      // Clean up the session since this user is not an admin
      await supabase.auth.signOut();

      // Provide detailed error message
      if (adminError) {
        console.error('Admin query error:', adminError);
        throw new Error(`Admin verification failed: ${adminError.message} (Code: ${adminError.code})`);
      } else {
        throw new Error(`User is not authorized as an admin. User ID ${authData.user.id} not found in admin table.`);
      }
    }

    // Step 5: Return user, admin, and session
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
      // Step 1: Get current session from Supabase
      console.log('[adminAuth] Getting current session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // Step 2: Return null if no session
      if (sessionError) {
        console.log('[adminAuth] Session error:', sessionError.message);
        return null;
      }

      if (!session) {
        console.log('[adminAuth] No session found');
        return null;
      }

      console.log('[adminAuth] Session found for user:', session.user.id);

      // Step 3: Verify user is in admin table
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      // Step 4: Return null if not an admin
      if (adminError) {
        console.log('[adminAuth] Admin query error:', adminError.message, adminError.code);
        return null;
      }

      if (!adminData) {
        console.log('[adminAuth] User not found in admin table');
        return null;
      }

      console.log('[adminAuth] Admin verified:', adminData.email);

      // Step 5: Return user, admin, and session
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
    const { error } = await supabase.auth.signOut();

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
