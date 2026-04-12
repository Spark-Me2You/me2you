/**
 * Profile Service
 * CRUD operations for user profiles and profile photos
 */

import { supabase } from '@/core/supabase/client';
import { storageService } from '@/core/supabase/storage';
import type { UserProfile } from '@/core/auth/AuthContext';
import type { UpdateProfileInput, ProfileWithImage } from '../types/profileTypes';

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

    return {
      profile: profile as UserProfile,
      imageUrl,
      imageStoragePath: imageData?.storage_path || null,
      imageId: imageData?.id || null,
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
   * Update/replace profile photo with gesture category
   * @param photo - Photo blob to upload
   * @param userId - User ID
   * @param orgId - Organization ID
   * @param category - Gesture category (wave, peace_sign, thumbs_up)
   * @param existingImageId - Optional existing image ID to delete
   * @param existingStoragePath - Optional existing storage path to delete
   * @returns Promise with new image ID and storage path
   * @throws Error if upload or deletion fails
   */
  updatePhoto: async (
    photo: Blob,
    userId: string,
    orgId: string,
    category: string,
    existingImageId?: string | null,
    existingStoragePath?: string | null
  ): Promise<{ id: string; storage_path: string }> => {
    // Delete existing photo if present
    if (existingImageId && existingStoragePath) {
      try {
        await profileService.deletePhoto(existingImageId, existingStoragePath);
      } catch (e) {
        console.warn('[profileService] Failed to delete old photo, continuing anyway:', e);
      }
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

    return data;
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
};
