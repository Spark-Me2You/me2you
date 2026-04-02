/**
 * Smart Crop Service
 * Calls the smart-crop Edge Function to generate cropped versions of profile photos
 */

import { supabase } from '@/core/supabase/client';

export interface SmartCropResponse {
  success: boolean;
  cropped_path?: string;
  error?: string;
}

export const smartCropService = {
  /**
   * Trigger smart crop for an image
   * Fire-and-forget call (handles errors silently)
   *
   * @param imageId - Image record ID to crop
   * @returns Promise resolving when request is sent (not when crop completes)
   * @throws Error if request cannot be sent
   */
  triggerSmartCrop: async (imageId: string): Promise<void> => {
    if (!imageId) {
      throw new Error('Image ID is required');
    }

    console.log('[smartCropService] Triggering smart crop for image:', imageId);

    try {
      const { data, error } = await supabase.functions.invoke('smart-crop', {
        body: { image_id: imageId },
      });

      if (error) {
        // Log but don't throw — this is fire-and-forget
        console.error('[smartCropService] Smart crop request failed:', error);
        return;
      }

      const response = data as SmartCropResponse;

      if (response.success) {
        console.log('[smartCropService] Smart crop triggered successfully');
        console.log('[smartCropService] Cropped path:', response.cropped_path);
      } else {
        console.error('[smartCropService] Smart crop failed on server:', response.error);
      }
    } catch (err) {
      // Network or parsing error — log but don't throw
      console.error('[smartCropService] Failed to invoke smart-crop function:', err);
    }
  },

  /**
   * Check if an image has a cropped version available
   *
   * @param imageId - Image record ID
   * @returns Promise with cropped_path if available, null otherwise
   */
  getCroppedPath: async (imageId: string): Promise<string | null> => {
    if (!imageId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('image')
        .select('cropped_path')
        .eq('id', imageId)
        .single();

      if (error || !data) {
        console.error('[smartCropService] Failed to fetch cropped_path:', error);
        return null;
      }

      return data.cropped_path ?? null;
    } catch (err) {
      console.error('[smartCropService] Error getting cropped path:', err);
      return null;
    }
  },
};
