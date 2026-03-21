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
   * TODO: Implement photo deletion
   */
  deletePhoto: async (_path: string) => {
    // TODO: Implement photo deletion
  },
};
