/**
 * Registration Service
 * Orchestrates the complete registration flow:
 * 1. Sign up (create auth account)
 * 2. Create user profile
 * 3. Upload photo
 * 4. Create image record
 */

import { userRegistrationAuthService, type CreateUserProfileInput } from '@/core/supabase/userRegistrationAuth';
import { storageService } from '@/core/supabase/storage';
import type { UserProfile } from '@/core/auth/AuthContext';
import type { User } from '@supabase/supabase-js';

/**
 * Registration form data
 */
export interface RegistrationFormData {
  // Auth step
  email: string;
  password: string;

  // Profile step
  name: string;
  status?: string;
  pronouns?: string;
  major?: string;
  interests?: string[];

  // Photo step
  photo?: Blob | null;
}

/**
 * Registration result
 */
export interface RegistrationResult {
  user: User;
  profile: UserProfile;
  imageId?: string;
}

/**
 * Get the default org ID from environment
 */
const getDefaultOrgId = (): string => {
  const orgId = import.meta.env.VITE_DEFAULT_ORG_ID;
  if (!orgId) {
    throw new Error('VITE_DEFAULT_ORG_ID environment variable is not set');
  }
  return orgId;
};

export const registrationService = {
  /**
   * Step 1: Sign up with email and password
   * Creates an auth.users record
   *
   * @param email - User email
   * @param password - User password
   * @returns The created user
   */
  signUp: async (email: string, password: string): Promise<User> => {
    const result = await userRegistrationAuthService.signUp(email, password);
    return result.user;
  },

  /**
   * Step 2: Create user profile
   * Creates a record in the user table
   *
   * @param profileData - Profile data (excluding org_id)
   * @returns The created profile
   */
  createProfile: async (profileData: Omit<CreateUserProfileInput, 'org_id'>): Promise<UserProfile> => {
    const orgId = getDefaultOrgId();

    return userRegistrationAuthService.createUserProfile({
      ...profileData,
      org_id: orgId,
    });
  },

  /**
   * Step 3: Upload photo and create image record
   * Uploads photo to storage and creates database record with gesture category
   *
   * @param photo - Photo blob
   * @param userId - User ID (owner)
   * @param category - Gesture category (wave, peace_sign, thumbs_up)
   * @returns The created image record
   */
  uploadPhotoAndCreateRecord: async (
    photo: Blob,
    userId: string,
    category: string = 'wave'
  ): Promise<{ id: string; storage_path: string }> => {
    const orgId = getDefaultOrgId();

    // Upload to storage
    const storagePath = await storageService.uploadPhoto(photo, userId, orgId);

    // Create image record with gesture category
    const imageRecord = await userRegistrationAuthService.createImageRecord({
      owner_id: userId,
      org_id: orgId,
      storage_path: storagePath,
      category: category,
      is_public: true,
    });

    return imageRecord;
  },

  /**
   * Complete registration flow
   * Performs all steps in sequence:
   * 1. Sign up
   * 2. Create profile
   * 3. Upload photo (if provided)
   *
   * @param formData - Complete registration form data
   * @returns Registration result with user, profile, and optional image
   */
  completeRegistration: async (formData: RegistrationFormData): Promise<RegistrationResult> => {
    // Step 1: Sign up
    const user = await registrationService.signUp(formData.email, formData.password);

    // Step 2: Create profile
    const profile = await registrationService.createProfile({
      name: formData.name,
      status: formData.status || null,
      pronouns: formData.pronouns || null,
      major: formData.major || null,
      interests: formData.interests || null,
    });

    // Step 3: Upload photo if provided
    let imageId: string | undefined;
    if (formData.photo) {
      const imageRecord = await registrationService.uploadPhotoAndCreateRecord(
        formData.photo,
        user.id
      );
      imageId = imageRecord.id;
    }

    return {
      user,
      profile,
      imageId,
    };
  },
};
