/**
 * User Registration Authentication Service
 * Handles user signup and profile creation for mobile registration flow
 */

import { supabase } from "./client";
import type { User, Session } from "@supabase/supabase-js";
import type { UserProfile } from "@/core/auth/AuthContext";

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
  signUp: async (
    email: string,
    password: string,
  ): Promise<{ user: User; session: Session }> => {
    console.log("[userRegistrationAuth] Signing up user:", email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("[userRegistrationAuth] Signup error:", error);
      // Preserve error code for better error handling
      const errorWithCode = new Error(`Signup failed: ${error.message}`) as Error & { code?: string };
      errorWithCode.code = error.code;
      throw errorWithCode;
    }

    if (!data.user) {
      throw new Error("No user returned from signup");
    }

    // For MVP, we're not requiring email confirmation
    // If email confirmation is enabled, session will be null
    if (!data.session) {
      console.log(
        "[userRegistrationAuth] No session - email confirmation may be required",
      );
      throw new Error(
        "Email confirmation is required. Please check your email and try again.",
      );
    }

    console.log(
      "[userRegistrationAuth] Signup successful, user ID:",
      data.user.id,
    );

    return {
      user: data.user,
      session: data.session,
    };
  },

  /**
   * Create a minimal user record immediately after signup
   * Creates user table entry with empty fields and onboarding_complete = false
   *
   * @param userId - Auth user ID
   * @param orgId - Organization ID
   * @returns Promise with minimal user profile
   * @throws Error if creation fails
   */
  createMinimalUserRecord: async (
    userId: string,
    orgId: string,
  ): Promise<void> => {
    console.log(
      "[userRegistrationAuth] Creating minimal user record for user:",
      userId,
    );

    const minimalUser = {
      id: userId,
      org_id: orgId,
      name: "", // Empty, filled during profile step
      onboarding_complete: false,
      visibility: "private", // Private until onboarding complete (security: prevents ghost profiles)
    };

    const { error } = await supabase.from("user").insert(minimalUser);

    if (error) {
      console.error(
        "[userRegistrationAuth] Minimal user record creation error:",
        error,
      );
      throw new Error(`Failed to create user record: ${error.message}`);
    }

    console.log(
      "[userRegistrationAuth] Minimal user record created successfully",
    );
  },

  /**
   * Create a user profile record in the user table
   * Must be called after successful signup (user must be authenticated)
   *
   * @param profileData - User profile data
   * @returns Promise with created profile
   * @throws Error if profile creation fails
   */
  createUserProfile: async (
    profileData: CreateUserProfileInput,
  ): Promise<UserProfile> => {
    console.log("[userRegistrationAuth] Creating user profile...");

    // Get current user to use their ID
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No authenticated user found. Please sign up first.");
    }

    const profileToInsert = {
      id: user.id,
      name: profileData.name,
      status: profileData.status || null,
      pronouns: profileData.pronouns || null,
      major: profileData.major || null,
      interests: profileData.interests || null,
      org_id: profileData.org_id,
      visibility: "public",
    };

    console.log("[userRegistrationAuth] Inserting profile:", profileToInsert);

    const { data, error } = await supabase
      .from("user")
      .upsert(profileToInsert, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("[userRegistrationAuth] Profile creation error:", error);
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    console.log("[userRegistrationAuth] Profile created successfully");

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
  createImageRecord: async (
    imageData: CreateImageRecordInput,
  ): Promise<{ id: string; storage_path: string }> => {
    console.log("[userRegistrationAuth] Creating image record...");

    const imageToInsert = {
      owner_id: imageData.owner_id,
      org_id: imageData.org_id,
      storage_path: imageData.storage_path,
      category: imageData.category || "profile",
      is_public: imageData.is_public ?? true,
    };

    const { data, error } = await supabase
      .from("image")
      .insert(imageToInsert)
      .select("id, storage_path")
      .single();

    if (error) {
      console.error(
        "[userRegistrationAuth] Image record creation error:",
        error,
      );
      throw new Error(`Failed to create image record: ${error.message}`);
    }

    console.log("[userRegistrationAuth] Image record created successfully");

    return data;
  },

  /**
   * Get current user session
   * Used to check if user is already authenticated
   *
   * @returns Promise with session or null
   */
  getCurrentSession: async (): Promise<Session | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },

  /**
   * Update user profile and mark onboarding complete
   * Used to fill in the minimal user record with full profile data
   *
   * @param userId - User ID
   * @param profileData - Complete profile data
   * @returns Promise with updated profile
   * @throws Error if update fails
   */
  updateUserProfile: async (
    userId: string,
    profileData: Omit<CreateUserProfileInput, "org_id">,
  ): Promise<UserProfile> => {
    console.log(
      "[userRegistrationAuth] Updating user profile for user:",
      userId,
    );

    const updateData = {
      name: profileData.name,
      status: profileData.status || null,
      pronouns: profileData.pronouns || null,
      major: profileData.major || null,
      interests: profileData.interests || null,
      onboarding_complete: true,
      visibility: "public", // Make profile public when onboarding completes
    };

    const { data, error } = await supabase
      .from("user")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("[userRegistrationAuth] Profile update error:", error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    console.log("[userRegistrationAuth] Profile updated successfully");

    return data as UserProfile;
  },

  /**
   * Get current user profile from user table
   *
   * @returns Promise with user profile or null
   */
  getCurrentUserProfile: async (): Promise<UserProfile | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from("user")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return null;
    }

    return data as UserProfile;
  },

  /**
   * Sign in existing user with email and password
   * Used for Automatic Rescue flow when user returns to incomplete registration
   *
   * @param email - User email
   * @param password - User password
   * @returns Promise with user and session
   * @throws Error if sign in fails
   */
  signIn: async (
    email: string,
    password: string,
  ): Promise<{ user: User; session: Session }> => {
    console.log("[userRegistrationAuth] Signing in user:", email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[userRegistrationAuth] Sign in error:", error);
      throw new Error(`Sign in failed: ${error.message}`);
    }

    if (!data.user || !data.session) {
      throw new Error("No user or session returned from sign in");
    }

    console.log(
      "[userRegistrationAuth] Sign in successful, user ID:",
      data.user.id,
    );

    return {
      user: data.user,
      session: data.session,
    };
  },

  /**
   * Check if user has completed onboarding
   * Used for Automatic Rescue flow
   *
   * @param userId - User ID to check
   * @returns Promise with onboarding_complete status, or null if user not found
   */
  checkOnboardingComplete: async (userId: string): Promise<boolean | null> => {
    console.log(
      "[userRegistrationAuth] Checking onboarding status for user:",
      userId,
    );

    const { data, error } = await supabase
      .from("user")
      .select("onboarding_complete")
      .eq("id", userId)
      .single();

    if (error) {
      console.error(
        "[userRegistrationAuth] Error checking onboarding status:",
        error,
      );
      return null;
    }

    return data?.onboarding_complete ?? null;
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
