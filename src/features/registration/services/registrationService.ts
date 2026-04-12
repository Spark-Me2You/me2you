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
import type { FaceLandmarks } from './faceCropService';

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
   * @param orgId - Organization ID from validated QR token
   * @returns The created profile
   */
  createProfile: async (
    profileData: Omit<CreateUserProfileInput, 'org_id'>,
    orgId: string
  ): Promise<UserProfile> => {
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
   * @param orgId - Organization ID from validated QR token
   * @param category - Gesture category (wave, peace_sign, thumbs_up)
   * @returns The created image record
   */
  uploadPhotoAndCreateRecord: async (
    photo: Blob,
    userId: string,
    orgId: string,
    category: string = 'wave'
  ): Promise<{ id: string; storage_path: string }> => {
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
   * Upload gesture photo and create gesture_image record
   * New method that uses gesture_image table instead of legacy image table
   *
   * @param photo - Photo blob (gesture photo)
   * @param userId - User ID (owner)
   * @param orgId - Organization ID from validated QR token
   * @param category - Gesture category (wave, peace_sign, thumbs_up)
   * @returns The created gesture_image record
   */
  uploadGesturePhoto: async (
    photo: Blob,
    userId: string,
    orgId: string,
    category: string
  ): Promise<{ id: string; storage_path: string }> => {
    // Upload to storage
    const storagePath = await storageService.uploadPhoto(photo, userId, orgId);

    // Create gesture_image record
    const gestureImageRecord = await userRegistrationAuthService.createGestureImageRecord({
      owner_id: userId,
      org_id: orgId,
      storage_path: storagePath,
      category: category,
      is_public: true,
    });

    return gestureImageRecord;
  },

  /**
   * Upload cropped photo and create cropped_image record with landmarks
   * Uploads PNG with transparency and stores face landmark metadata
   *
   * @param croppedBlob - Cropped photo blob (PNG with transparency)
   * @param userId - User ID (owner)
   * @param orgId - Organization ID from validated QR token
   * @param landmarks - Face landmark positions (normalized 0-1 coordinates)
   * @returns The created cropped_image record
   */
  uploadCroppedPhotoWithLandmarks: async (
    croppedBlob: Blob,
    userId: string,
    orgId: string,
    landmarks: FaceLandmarks
  ): Promise<{ id: string; storage_path: string }> => {
    // Generate base filename for cropped version
    const baseFileName = crypto.randomUUID();

    // Upload cropped photo to storage (PNG with transparency)
    const storagePath = await storageService.uploadCroppedPhoto(
      croppedBlob,
      userId,
      orgId,
      baseFileName
    );

    // Create cropped_image record with landmark metadata
    const croppedImageRecord = await userRegistrationAuthService.createCroppedImageRecord({
      owner_id: userId,
      org_id: orgId,
      storage_path: storagePath,
      landmarks: landmarks,
      is_public: true,
    });

    return croppedImageRecord;
  },

  /**
   * Complete registration flow
   * Performs all steps in sequence:
   * 1. Sign up
   * 2. Create profile
   * 3. Upload photo (if provided)
   *
   * @param formData - Complete registration form data
   * @param orgId - Organization ID from validated QR token
   * @returns Registration result with user, profile, and optional image
   */
  completeRegistration: async (
    formData: RegistrationFormData,
    orgId: string
  ): Promise<RegistrationResult> => {
    // Step 1: Sign up
    const user = await registrationService.signUp(formData.email, formData.password);

    // Step 2: Create profile
    const profile = await registrationService.createProfile(
      {
        name: formData.name,
        status: formData.status || null,
        pronouns: formData.pronouns || null,
        major: formData.major || null,
        interests: formData.interests || null,
      },
      orgId
    );

    // Step 3: Upload photo if provided
    let imageId: string | undefined;
    if (formData.photo) {
      const imageRecord = await registrationService.uploadPhotoAndCreateRecord(
        formData.photo,
        user.id,
        orgId
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
