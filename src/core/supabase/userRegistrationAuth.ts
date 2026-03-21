/**
 * User Registration Authentication Service
 * Handles user signup and profile creation for mobile registration flow
 */

import { supabase } from './client';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/core/auth/AuthContext';

/**
 * Input for creating a user profile
 */
export interface CreateUserProfileInput {
  name: string;
  status?: string | null;
  pronouns?: string | null;
  major?: string | null;
  interests?: string[] | null;
  org_id: string;
}

/**
 * Input for creating an image record
 */
export interface CreateImageRecordInput {
  owner_id: string;
  org_id: string;
  storage_path: string;
  category?: string;
  is_public?: boolean;
}

/**
 * User Registration Auth Service
 * Handles email/password signup and profile creation
 */
export const userRegistrationAuthService = {
  /**
   * Sign up a new user with email and password
   * Creates an auth.users record in Supabase
   *
   * @param email - User email address
   * @param password - User password
   * @returns Promise with user and session
   * @throws Error if signup fails
   */
  signUp: async (email: string, password: string): Promise<{ user: User; session: Session }> => {
    console.log('[userRegistrationAuth] Signing up user:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('[userRegistrationAuth] Signup error:', error);
      throw new Error(`Signup failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('No user returned from signup');
    }

    // For MVP, we're not requiring email confirmation
    // If email confirmation is enabled, session will be null
    if (!data.session) {
      console.log('[userRegistrationAuth] No session - email confirmation may be required');
      throw new Error('Email confirmation is required. Please check your email and try again.');
    }

    console.log('[userRegistrationAuth] Signup successful, user ID:', data.user.id);

    return {
      user: data.user,
      session: data.session,
    };
  },

  /**
   * Create a user profile record in the user table
   * Must be called after successful signup (user must be authenticated)
   *
   * @param profileData - User profile data
   * @returns Promise with created profile
   * @throws Error if profile creation fails
   */
  createUserProfile: async (profileData: CreateUserProfileInput): Promise<UserProfile> => {
    console.log('[userRegistrationAuth] Creating user profile...');

    // Get current user to use their ID
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No authenticated user found. Please sign up first.');
    }

    const profileToInsert = {
      id: user.id,
      name: profileData.name,
      status: profileData.status || null,
      pronouns: profileData.pronouns || null,
      major: profileData.major || null,
      interests: profileData.interests || null,
      org_id: profileData.org_id,
      visibility: 'public',
    };

    console.log('[userRegistrationAuth] Inserting profile:', profileToInsert);

    const { data, error } = await supabase
      .from('user')
      .insert(profileToInsert)
      .select()
      .single();

    if (error) {
      console.error('[userRegistrationAuth] Profile creation error:', error);
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    console.log('[userRegistrationAuth] Profile created successfully');

    return data as UserProfile;
  },

  /**
   * Create an image record in the image table
   * Must be called after user profile is created (for RLS)
   *
   * @param imageData - Image record data
   * @returns Promise with created image record
   * @throws Error if image record creation fails
   */
  createImageRecord: async (imageData: CreateImageRecordInput): Promise<{ id: string; storage_path: string }> => {
    console.log('[userRegistrationAuth] Creating image record...');

    const imageToInsert = {
      owner_id: imageData.owner_id,
      org_id: imageData.org_id,
      storage_path: imageData.storage_path,
      category: imageData.category || 'profile',
      is_public: imageData.is_public ?? true,
    };

    const { data, error } = await supabase
      .from('image')
      .insert(imageToInsert)
      .select('id, storage_path')
      .single();

    if (error) {
      console.error('[userRegistrationAuth] Image record creation error:', error);
      throw new Error(`Failed to create image record: ${error.message}`);
    }

    console.log('[userRegistrationAuth] Image record created successfully');

    return data;
  },

  /**
   * Get current user session
   * Used to check if user is already authenticated
   *
   * @returns Promise with session or null
   */
  getCurrentSession: async (): Promise<Session | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  /**
   * Get current user profile from user table
   *
   * @returns Promise with user profile or null
   */
  getCurrentUserProfile: async (): Promise<UserProfile | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return null;
    }

    return data as UserProfile;
  },

  /**
   * Sign out current user
   *
   * @throws Error if sign out fails
   */
  signOut: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  },
};
