/**
 * Authentication Service
 * Handles organization-level authentication and session management
 */

import { supabase } from './client';
import type { Database } from './client';

type Organization = Database['public']['Tables']['organization']['Row'];
type User = Database['public']['Tables']['user']['Row'];

/**
 * Response type for authentication operations
 */
export interface AuthResponse {
  success: boolean;
  error?: string;
  data?: {
    user: User | null;
    organization: Organization;
    isOrgAdmin: boolean;
  };
}

/**
 * Session data returned by getCurrentSession
 */
export interface SessionData {
  user: User | null;
  organization: Organization;
  isOrgAdmin: boolean;
}

export const authService = {
  /**
   * Sign in organization with email and password
   */
  signInWithEmail: async (
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    try {
      console.log('[authService] signInWithEmail: Starting login for:', email);

      // 1. Authenticate with Supabase Auth
      console.log('[authService] signInWithEmail: Calling supabase.auth.signInWithPassword...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[authService] signInWithEmail: Auth result:', {
        hasData: !!authData,
        hasUser: !!authData?.user,
        userId: authData?.user?.id,
        error: authError
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Authentication failed' };
      }

      // 2. Fetch org_admin record to get org_id
      console.log('[authService] signInWithEmail: Fetching org_admin for user:', authData.user.id);
      const { data: orgAdminData, error: orgAdminError } = await supabase
        .from('org_admin')
        .select('org_id, role')
        .eq('auth_user_id', authData.user.id)
        .single();

      console.log('[authService] signInWithEmail: org_admin result:', {
        hasData: !!orgAdminData,
        error: orgAdminError
      });

      if (orgAdminError || !orgAdminData) {
        return { success: false, error: 'Organization admin record not found' };
      }

      // 3. Fetch organization data
      console.log('[authService] signInWithEmail: Fetching organization:', orgAdminData.org_id);
      const { data: orgData, error: orgError } = await supabase
        .from('organization')
        .select('*')
        .eq('id', orgAdminData.org_id)
        .single();

      console.log('[authService] signInWithEmail: organization result:', {
        hasData: !!orgData,
        error: orgError
      });

      if (orgError || !orgData) {
        return { success: false, error: 'Organization not found' };
      }

      // 4. Fetch user profile (optional - org admins may not have user profiles)
      console.log('[authService] signInWithEmail: Fetching user profile (optional):', authData.user.id);
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      console.log('[authService] signInWithEmail: user profile result:', {
        hasData: !!userData,
        error: userError,
        note: 'User profile is optional for org admins'
      });

      // User profile is optional - org admins don't need to be users
      console.log('[authService] signInWithEmail: Login successful!');
      return {
        success: true,
        data: {
          user: userData || null,
          organization: orgData,
          isOrgAdmin: true,
        },
      };
    } catch (error) {
      console.error('[authService] signInWithEmail: Exception caught:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Sign up new organization
   * Creates auth user, organization, and org_admin record (no user profile needed)
   */
  signUpOrganization: async (
    email: string,
    password: string,
    organizationName: string
  ): Promise<AuthResponse> => {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Sign up failed' };
      }

      // 2. Create organization record
      const { data: orgData, error: orgError } = await supabase
        .from('organization')
        .insert({
          name: organizationName,
        })
        .select()
        .single();

      if (orgError || !orgData) {
        // Rollback: delete auth user if org creation fails
        // Note: This requires Supabase admin SDK, which we don't have in client
        // In production, use database triggers or server-side logic for rollback
        return { success: false, error: 'Failed to create organization' };
      }

      // 3. Create org_admin record (skip user profile for admin-only accounts)
      const { data: orgAdminData, error: orgAdminError } = await supabase
        .from('org_admin')
        .insert({
          org_id: orgData.id,
          auth_user_id: authData.user.id,
          email: email,
          role: 'admin',
        })
        .select()
        .single();

      if (orgAdminError || !orgAdminData) {
        return { success: false, error: 'Failed to create admin record' };
      }

      return {
        success: true,
        data: {
          user: null, // Org admins don't have user profiles
          organization: orgData,
          isOrgAdmin: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get current session and organization
   */
  getCurrentSession: async (): Promise<SessionData | null> => {
    try {
      console.log('[authService] getCurrentSession: Starting...');

      // 1. Get current auth session
      console.log('[authService] getCurrentSession: Fetching auth session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      console.log('[authService] getCurrentSession: Auth session result:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        error: sessionError
      });

      if (!session?.user) {
        console.log('[authService] getCurrentSession: No session or user found');
        return null;
      }

      // 2. Fetch org_admin record
      console.log('[authService] getCurrentSession: Fetching org_admin record for user:', session.user.id);
      const { data: orgAdminData, error: orgAdminError } = await supabase
        .from('org_admin')
        .select('org_id')
        .eq('auth_user_id', session.user.id)
        .single();

      console.log('[authService] getCurrentSession: org_admin result:', {
        hasData: !!orgAdminData,
        orgId: orgAdminData?.org_id,
        error: orgAdminError
      });

      if (!orgAdminData) {
        console.log('[authService] getCurrentSession: No org_admin record found');
        return null;
      }

      // 3. Fetch organization
      console.log('[authService] getCurrentSession: Fetching organization:', orgAdminData.org_id);
      const { data: orgData, error: orgError } = await supabase
        .from('organization')
        .select('*')
        .eq('id', orgAdminData.org_id)
        .single();

      console.log('[authService] getCurrentSession: organization result:', {
        hasData: !!orgData,
        error: orgError
      });

      // 4. Fetch user profile (optional - org admins may not have user profiles)
      console.log('[authService] getCurrentSession: Fetching user profile (optional):', session.user.id);
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('id', session.user.id)
        .single();

      console.log('[authService] getCurrentSession: user profile result:', {
        hasData: !!userData,
        error: userError,
        note: 'User profile is optional for org admins'
      });

      if (!orgData) {
        console.log('[authService] getCurrentSession: Missing org data');
        return null;
      }

      console.log('[authService] getCurrentSession: Success! Returning session data');
      return {
        user: userData || null,
        organization: orgData,
        isOrgAdmin: true,
      };
    } catch (error) {
      console.error('[authService] getCurrentSession: Exception caught:', error);
      return null;
    }
  },

  /**
   * Sign out current organization
   */
  signOut: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};
