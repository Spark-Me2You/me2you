/**
 * Storage Service
 * Photo upload and storage helpers for Supabase storage bucket
 */

import { supabase } from './client';

export const storageService = {
  /**
   * Upload photo to storage
   * Stores in path: {org_id}/{user_id}/{uuid}.jpg
   *
   * @param file - File or Blob to upload
   * @param userId - User ID for path organization
   * @param orgId - Organization ID for path organization
   * @returns Promise with storage path
   * @throws Error if upload fails
   */
  uploadPhoto: async (file: File | Blob, userId: string, orgId: string): Promise<string> => {
    const fileExt = 'jpg';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const path = `${orgId}/${userId}/${fileName}`;

    console.log('[storage] Uploading photo to path:', path);

    const { error } = await supabase.storage
      .from('images')
      .upload(path, file, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('[storage] Upload failed:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }

    console.log('[storage] Photo uploaded successfully');
    return path;
  },

  /**
   * Upload cropped photo to storage
   * Stores in path: {org_id}/{user_id}/{uuid}_cropped.{ext}
   * Supports both PNG (for transparency) and JPEG
   *
   * @param file - File or Blob to upload (cropped version)
   * @param userId - User ID for path organization
   * @param orgId - Organization ID for path organization
   * @param baseFileName - Base filename (without extension) for _cropped suffix
   * @returns Promise with storage path
   * @throws Error if upload fails
   */
  uploadCroppedPhoto: async (
    file: File | Blob,
    userId: string,
    orgId: string,
    baseFileName: string
  ): Promise<string> => {
    // Determine content type and extension from blob type
    const isPng = file.type === 'image/png';
    const ext = isPng ? 'png' : 'jpg';
    const contentType = isPng ? 'image/png' : 'image/jpeg';

    const path = `${orgId}/${userId}/${baseFileName}_cropped.${ext}`;

    console.log('[storage] Uploading cropped photo to path:', path, `(${contentType})`);

    const { error } = await supabase.storage
      .from('images')
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('[storage] Cropped upload failed:', error);
      throw new Error(`Failed to upload cropped photo: ${error.message}`);
    }

    console.log('[storage] Cropped photo uploaded successfully');
    return path;
  },

  /**
   * Get URL for photo from Supabase Storage
   * Uses signed URL for private buckets (60 minute expiry)
   *
   * @param path - Storage path (from image.storage_path field in database)
   * @returns Promise with signed URL to access the image
   * @throws Error if path is empty or URL generation fails
   *
   * @example
   * const url = await storageService.getPhotoUrl('org-id/user-id/profile.jpg');
   * // Returns: https://<project>.supabase.co/storage/v1/object/sign/images/org-id/user-id/profile.jpg?token=...
   */
  getPhotoUrl: async (path: string): Promise<string> => {
    if (!path || path.trim() === '') {
      throw new Error('Storage path cannot be empty');
    }

    // Generate signed URL for private bucket
    // Expires in 3600 seconds (1 hour)
    const { data, error } = await supabase.storage
      .from('images')
      .createSignedUrl(path, 3600);

    if (error || !data || !data.signedUrl) {
      throw new Error(`Failed to generate signed URL for path: ${path}. Error: ${error?.message}`);
    }

    return data.signedUrl;
  },

  /**
   * Delete photo from storage
   * @param path - Storage path to delete
   * @throws Error if deletion fails
   */
  deletePhoto: async (path: string): Promise<void> => {
    console.log('[storage] Deleting photo at path:', path);

    const { error } = await supabase.storage
      .from('images')
      .remove([path]);

    if (error) {
      console.error('[storage] Delete failed:', error);
      throw new Error(`Failed to delete photo: ${error.message}`);
    }

    console.log('[storage] Photo deleted successfully');
  },
};
