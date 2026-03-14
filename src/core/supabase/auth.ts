/**
 * Authentication Service
 * Provides authentication methods for both admin login and user card swipe
 */

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
   * TODO: Implement the following steps:
   * 1. Call supabase.auth.signInWithPassword({ email, password })
   * 2. Check for authentication errors and throw if present
   * 3. Verify the authenticated user exists
   * 4. Query the 'admin' table to verify the user is an admin:
   *    - SELECT * FROM admin WHERE id = user.id
   * 5. If no admin record found, sign out the user and throw an error
   * 6. Return an object with { user, admin, session }
   *
   * @param email - Admin email address
   * @param password - Admin password
   * @returns Promise with user, admin data, and session
   * @throws Error if authentication fails or user is not an admin
   */
  signInWithEmail: async (email: string, _password: string): Promise<{ user: User; admin: AdminUser; session: Session }> => {
    // TODO: Implement Supabase email/password authentication
    // const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    //   email,
    //   password,
    // });

    // TODO: Handle authentication errors
    // if (authError) throw authError;
    // if (!authData.user) throw new Error('No user returned from authentication');

    // TODO: Verify user is in admin table
    // const { data: adminData, error: adminError } = await supabase
    //   .from('admin')
    //   .select('*')
    //   .eq('id', authData.user.id)
    //   .single();

    // TODO: If not an admin, sign out and throw error
    // if (adminError || !adminData) {
    //   await supabase.auth.signOut();
    //   throw new Error('User is not an admin');
    // }

    // TODO: Return user, admin, and session
    // return {
    //   user: authData.user,
    //   admin: adminData as AdminUser,
    //   session: authData.session,
    // };

    console.log('signInWithEmail called with:', email);
    throw new Error('Admin authentication not yet implemented');
  },

  /**
   * Get current admin session
   *
   * TODO: Implement the following steps:
   * 1. Call supabase.auth.getSession() to get the current session
   * 2. If no session exists, return null
   * 3. Query the 'admin' table to verify the user is an admin
   * 4. If no admin record found, return null
   * 5. Return an object with { user, admin, session }
   *
   * @returns Promise with current admin session or null
   */
  getCurrentAdmin: async (): Promise<{ user: User; admin: AdminUser; session: Session } | null> => {
    // TODO: Get current session from Supabase
    // const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // TODO: Return null if no session
    // if (sessionError || !session) return null;

    // TODO: Verify user is in admin table
    // const { data: adminData } = await supabase
    //   .from('admin')
    //   .select('*')
    //   .eq('id', session.user.id)
    //   .single();

    // TODO: Return null if not an admin
    // if (!adminData) return null;

    // TODO: Return user, admin, and session
    // return {
    //   user: session.user,
    //   admin: adminData as AdminUser,
    //   session,
    // };

    return null;
  },

  /**
   * Sign out current admin
   *
   * TODO: Implement the following steps:
   * 1. Call supabase.auth.signOut()
   * 2. Handle any errors that occur during sign out
   *
   * @throws Error if sign out fails
   */
  signOut: async () => {
    // TODO: Sign out from Supabase
    // const { error } = await supabase.auth.signOut();
    // if (error) throw error;

    console.log('signOut called');
    throw new Error('Admin sign out not yet implemented');
  },

  /**
   * Listen to authentication state changes
   *
   * TODO: Implement the following:
   * 1. Call supabase.auth.onAuthStateChange(callback)
   * 2. Return the subscription object so it can be unsubscribed later
   *
   * @param callback - Function to call when auth state changes
   * @returns Subscription object with unsubscribe method
   */
  onAuthStateChange: (_callback: (event: string, session: Session | null) => void) => {
    // TODO: Subscribe to auth state changes
    // return supabase.auth.onAuthStateChange(callback);

    console.log('onAuthStateChange called');
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            console.log('Unsubscribed from auth state changes');
          },
        },
      },
    };
  },
};

/**
 * User Auth Service (Card Swipe)
 * Handles authentication for regular users via card swipe
 * TODO: Implement card swipe authentication logic
 */
export const authService = {
  /**
   * Authenticate user with card swipe
   * TODO: Implement card reader integration
   */
  authenticateWithCard: async (_cardId: string) => {
    // TODO: Implement card swipe authentication
    return null;
  },

  /**
   * Get current session
   * TODO: Implement session retrieval
   */
  getCurrentSession: async () => {
    // TODO: Implement session retrieval
    return null;
  },

  /**
   * Sign out current user
   * TODO: Implement sign out logic
   */
  signOut: async () => {
    // TODO: Implement sign out
  },
};
