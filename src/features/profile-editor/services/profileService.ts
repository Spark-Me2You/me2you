/**
 * Profile Service
 * CRUD operations for user profiles and profile photos
 */

import { supabase } from '@/core/supabase/client';
import { storageService } from '@/core/supabase/storage';
import { faceCropService, FaceNotDetectedError } from '@/features/registration/services/faceCropService';
import { registrationService } from '@/features/registration/services/registrationService';
import type { UserProfile } from '@/core/auth/AuthContext';
import type { UpdateProfileInput, ProfileWithImage, DeleteImagesResponse, DeleteAccountResponse } from '../types/profileTypes';

export const profileService = {
  /**
   * Get current user's profile with profile image
   * @returns Promise with profile data and image URL, or null if not found
   */
  getCurrentProfile: async (): Promise<ProfileWithImage | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[profileService] Failed to fetch profile:', profileError);
      return null;
    }

    // Fetch profile image (if exists)
    const { data: imageData } = await supabase
      .from('image')
      .select('id, storage_path')
      .eq('owner_id', user.id)
      .limit(1)
      .single();

    let imageUrl: string | null = null;
    if (imageData?.storage_path) {
      try {
        imageUrl = await storageService.getPhotoUrl(imageData.storage_path);
      } catch (e) {
        console.warn('[profileService] Failed to get image URL:', e);
      }
    }

    // Fetch bobblehead (cropped_image) if exists
    const { data: bobbleheadData } = await supabase
      .from('cropped_image')
      .select('id, storage_path')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let bobbleheadUrl: string | null = null;
    if (bobbleheadData?.storage_path) {
      try {
        bobbleheadUrl = await storageService.getPhotoUrl(bobbleheadData.storage_path);
      } catch (e) {
        console.warn('[profileService] Failed to get bobblehead URL:', e);
      }
    }

    return {
      profile: profile as UserProfile,
      imageUrl,
      imageStoragePath: imageData?.storage_path || null,
      imageId: imageData?.id || null,
      bobbleheadUrl,
      bobbleheadStoragePath: bobbleheadData?.storage_path || null,
      bobbleheadId: bobbleheadData?.id || null,
    };
  },

  /**
   * Update profile fields (not photo)
   * @param userId - User ID to update
   * @param data - Profile fields to update
   * @returns Promise with updated profile
   * @throws Error if update fails
   */
  updateProfile: async (userId: string, data: UpdateProfileInput): Promise<UserProfile> => {
    const { data: updated, error } = await supabase
      .from('user')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[profileService] Failed to update profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return updated as UserProfile;
  },

  /**
   * Update/replace profile photo with gesture category and generate bobblehead
   * @param photo - Photo blob to upload
   * @param userId - User ID
   * @param orgId - Organization ID
   * @param category - Gesture category (wave, peace_sign, thumbs_up)
   * @param existingImageId - Optional existing image ID to delete
   * @param existingStoragePath - Optional existing storage path to delete
   * @returns Promise with new image ID, storage path, and optional bobblehead error
   * @throws Error if photo upload fails (bobblehead errors are non-blocking)
   */
  updatePhoto: async (
    photo: Blob,
    userId: string,
    orgId: string,
    category: string,
    existingImageId?: string | null,
    existingStoragePath?: string | null
  ): Promise<{ id: string; storage_path: string; bobbleheadError?: string }> => {
    // Delete existing photo if present
    if (existingImageId && existingStoragePath) {
      try {
        await profileService.deletePhoto(existingImageId, existingStoragePath);
      } catch (e) {
        console.warn('[profileService] Failed to delete old photo, continuing anyway:', e);
      }
    }

    // Purge old gesture + cropped images before uploading new ones
    try {
      await profileService.deleteAllImages();
    } catch (e) {
      console.warn('[profileService] Failed to clear old gesture/cropped images, continuing anyway:', e);
    }

    // Upload new photo
    const storagePath = await storageService.uploadPhoto(photo, userId, orgId);

    // Create new image record
    const { data, error } = await supabase
      .from('image')
      .insert({
        owner_id: userId,
        org_id: orgId,
        storage_path: storagePath,
        category: category,
        is_public: true,
      })
      .select('id, storage_path')
      .single();

    if (error) {
      console.error('[profileService] Failed to create image record:', error);
      throw new Error(`Failed to create image record: ${error.message}`);
    }

    // Try to generate bobblehead (non-blocking - don't throw on error)
    let bobbleheadError: string | undefined;
    try {
      console.log('[profileService] Generating bobblehead from photo...');
      const cropResult = await faceCropService.cropFace(photo);

      if (cropResult.cropMetadata.landmarks) {
        await registrationService.uploadCroppedPhotoWithLandmarks(
          cropResult.croppedBlob,
          userId,
          orgId,
          cropResult.cropMetadata.landmarks
        );
        console.log('[profileService] Bobblehead generated successfully');
      } else {
        bobbleheadError = 'No face landmarks detected';
        console.warn('[profileService] Bobblehead generation failed:', bobbleheadError);
      }
    } catch (e) {
      if (e instanceof FaceNotDetectedError) {
        bobbleheadError = 'No face detected in photo';
      } else {
        bobbleheadError = e instanceof Error ? e.message : 'Bobblehead generation failed';
      }
      console.warn('[profileService] Bobblehead generation failed:', bobbleheadError);
    }

    return {
      ...data,
      bobbleheadError,
    };
  },

  /**
   * Delete photo from storage and database
   * @param imageId - Image record ID in database
   * @param storagePath - Storage path to delete
   * @throws Error if deletion fails
   */
  deletePhoto: async (imageId: string, storagePath: string): Promise<void> => {
    // Delete from storage
    try {
      await storageService.deletePhoto(storagePath);
    } catch (e) {
      console.warn('[profileService] Failed to delete from storage:', e);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('image')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      console.error('[profileService] Failed to delete image record:', dbError);
      throw new Error(`Failed to delete image record: ${dbError.message}`);
    }
  },

  /**
   * Delete all gesture and cropped images for the current user via edge function.
   * Leaves the user account and profile photo (image table) intact.
   */
  deleteAllImages: async (): Promise<{ gesture_rows_deleted: number; cropped_rows_deleted: number; storage_objects_deleted: number }> => {
    const { data, error } = await supabase.functions.invoke<DeleteImagesResponse>('delete-user-images', { body: {} });
    if (error) {
      console.error('[profileService] Failed to delete images:', error);
      throw new Error(error.message || 'Failed to delete images');
    }
    if (!data?.success) {
      throw new Error(data?.error || 'Failed to delete images');
    }
    return {
      gesture_rows_deleted: data.gesture_rows_deleted,
      cropped_rows_deleted: data.cropped_rows_deleted,
      storage_objects_deleted: data.storage_objects_deleted,
    };
  },

  /**
   * Permanently delete the current user's account, all images, and all storage objects.
   * Uses the delete-user-account edge function. After this call the user's session
   * is invalid — the caller must sign out immediately.
   */
  deleteAccount: async (): Promise<void> => {
    const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>('delete-user-account', { body: {} });
    if (error) {
      console.error('[profileService] Failed to delete account:', error);
      throw new Error(error.message || 'Failed to delete account');
    }
    if (!data?.success) {
      throw new Error(data?.error || 'Failed to delete account');
    }
  },
};
