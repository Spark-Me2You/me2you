/**
 * Discovery Service
 * API for matching gestures and fetching random profiles from the organization
 */

import { supabase } from '@/core/supabase/client';
import { storageService } from '@/core/supabase/storage';
import type { RandomImageData } from '../types/image';

export const discoveryService = {
  /**
   * Match gesture to profile
   * TODO: Implement gesture matching API call
   */
  matchGesture: async (_gestureEmbedding: number[]) => {
    // TODO: Send gesture embedding to backend for matching
    return null;
  },

  /**
   * Fetch a random public image from the organization, optionally filtered by category
   *
   * This function:
   * 1. Queries images joined with users
   * 2. Filters by org_id and is_public = true
   * 3. Optionally filters by category (e.g., "peace_sign", "wave", "thumbs_up")
   * 4. Randomly selects one image
   * 5. Generates public URL for the image
   * 6. Returns image data with owner info
   *
   * @param orgId - Organization ID from kiosk session
   * @param category - Optional image category filter ("peace_sign", "wave", "thumbs_up")
   * @returns Random image with owner display_name and bio, or null if no images found
   * @throws Error if database query fails
   *
   * @example
   * // Fetch any random image
   * const anyImage = await discoveryService.fetchRandomImage('org-uuid-123');
   *
   * // Fetch image matching peace sign gesture
   * const peaceImage = await discoveryService.fetchRandomImage('org-uuid-123', 'peace_sign');
   */
  fetchRandomImage: async (
    orgId: string,
    category?: string
  ): Promise<RandomImageData | null> => {
    if (!orgId) {
      throw new Error('Organization ID is required');
    }

    try {
      // Query images joined with user data
      // SQL equivalent: SELECT image.*, user.display_name, user.bio
      //                 FROM image JOIN user ON image.owner_id = user.id
      //                 WHERE image.org_id = orgId AND image.is_public = true
      //                 [AND image.category = category if provided]
      //
      // Note: Requires foreign key relationship from image.owner_id to user.id
      // (see migration 006_add_image_user_foreign_key.sql)
      let query = supabase
        .from('image')
        .select(
          `
          id,
          owner_id,
          org_id,
          storage_path,
          category,
          is_public,
          created_at,
          user (
            id,
            display_name,
            bio
          )
        `
        )
        .eq('org_id', orgId)
        .eq('is_public', true);

      // Add category filter if provided
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[discoveryService] Database query failed:', error);
        throw new Error(`Failed to fetch images: ${error.message}`);
      }

      // No public images found in this organization
      if (!data || data.length === 0) {
        console.log(
          '[discoveryService] No public images found for org:',
          orgId,
          category ? `with category: ${category}` : '(all categories)'
        );
        return null;
      }

      // Randomly select one image from the results
      const randomIndex = Math.floor(Math.random() * data.length);
      const selectedImage = data[randomIndex];

      // Validate joined user data exists
      // Note: Supabase returns joined data as an array, even for single relationships
      const userData = Array.isArray(selectedImage.user)
        ? selectedImage.user[0]
        : selectedImage.user;

      if (!userData) {
        console.error(
          '[discoveryService] Image has no owner:',
          selectedImage.id
        );
        throw new Error('Image owner data is missing');
      }

      // Generate signed URL for the image from storage bucket
      const imageUrl = await storageService.getPhotoUrl(selectedImage.storage_path);

      console.log(
        '[discoveryService] Random image selected:',
        selectedImage.id,
        'from',
        data.length,
        'available images'
      );

      // Construct return object with image data and owner info
      return {
        image: {
          id: selectedImage.id,
          owner_id: selectedImage.owner_id,
          org_id: selectedImage.org_id,
          storage_path: selectedImage.storage_path,
          category: selectedImage.category,
          is_public: selectedImage.is_public,
          created_at: selectedImage.created_at,
        },
        owner: {
          id: userData.id,
          display_name: userData.display_name,
          bio: userData.bio,
        },
        imageUrl,
      };
    } catch (error) {
      // Log and re-throw for upper layers to handle
      console.error('[discoveryService] fetchRandomImage failed:', error);
      throw error;
    }
  },

  /**
   * Get the total count of public images for a category
   *
   * This function is used for chamber initialization to determine:
   * - If a category has 0 images (error state)
   * - If a category has 1 image (never refill)
   * - If a category has fewer images than batch size
   *
   * @param orgId - Organization ID from kiosk session
   * @param category - Image category ("peace_sign", "wave", "thumbs_up")
   * @returns Total count of public images in category
   * @throws Error if database query fails
   *
   * @example
   * const count = await discoveryService.getImageCount('org-uuid-123', 'peace_sign');
   * if (count === 0) console.log('No images available');
   * if (count === 1) console.log('Single image - never refill');
   */
  getImageCount: async (orgId: string, category: string): Promise<number> => {
    if (!orgId || !category) {
      throw new Error('Organization ID and category are required');
    }

    try {
      const { count, error } = await supabase
        .from('image')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('category', category)
        .eq('is_public', true);

      if (error) {
        console.error('[discoveryService] Count query failed:', error);
        throw new Error(`Failed to count images: ${error.message}`);
      }

      console.log(
        `[discoveryService] Image count for ${category}:`,
        count ?? 0
      );

      return count ?? 0;
    } catch (error) {
      console.error('[discoveryService] getImageCount failed:', error);
      throw error;
    }
  },

  /**
   * Fetch a batch of random public images for a category
   *
   * This function is used for chamber pre-loading and refilling:
   * 1. Fetches up to `limit` images for a category
   * 2. Client-side shuffle for randomness (DB random is expensive for multiple rows)
   * 3. Generates signed URLs for all images
   * 4. Returns array of RandomImageData
   *
   * If fewer than `limit` images are returned, the caller knows the total count
   * is limited and can avoid future refills.
   *
   * @param orgId - Organization ID from kiosk session
   * @param category - Image category ("peace_sign", "wave", "thumbs_up")
   * @param limit - Maximum number of images to fetch
   * @returns Array of random images with owner data and URLs
   * @throws Error if database query fails
   *
   * @example
   * const images = await discoveryService.fetchRandomImageBatch('org-uuid-123', 'wave', 5);
   * // Returns 0-5 images depending on availability
   */
  fetchRandomImageBatch: async (
    orgId: string,
    category: string,
    limit: number
  ): Promise<RandomImageData[]> => {
    if (!orgId || !category) {
      throw new Error('Organization ID and category are required');
    }

    if (limit <= 0) {
      throw new Error('Limit must be greater than 0');
    }

    try {
      // Query images joined with user data
      const { data, error } = await supabase
        .from('image')
        .select(
          `
          id,
          owner_id,
          org_id,
          storage_path,
          category,
          is_public,
          created_at,
          user (
            id,
            display_name,
            bio
          )
        `
        )
        .eq('org_id', orgId)
        .eq('category', category)
        .eq('is_public', true)
        .limit(limit);

      if (error) {
        console.error('[discoveryService] Batch query failed:', error);
        throw new Error(`Failed to fetch image batch: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.log(
          `[discoveryService] No images found for batch: ${category}`
        );
        return [];
      }

      // Client-side shuffle using Fisher-Yates algorithm
      const shuffled = [...data];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Process each image and generate signed URLs
      const processedImages: RandomImageData[] = await Promise.all(
        shuffled.map(async (img) => {
          // Validate user data
          const userData = Array.isArray(img.user) ? img.user[0] : img.user;

          if (!userData) {
            console.warn(
              '[discoveryService] Image missing owner data:',
              img.id
            );
            throw new Error(`Image ${img.id} has no owner data`);
          }

          // Generate signed URL
          const imageUrl = await storageService.getPhotoUrl(img.storage_path);

          return {
            image: {
              id: img.id,
              owner_id: img.owner_id,
              org_id: img.org_id,
              storage_path: img.storage_path,
              category: img.category,
              is_public: img.is_public,
              created_at: img.created_at,
            },
            owner: {
              id: userData.id,
              display_name: userData.display_name,
              bio: userData.bio,
            },
            imageUrl,
          };
        })
      );

      console.log(
        `[discoveryService] Fetched batch for ${category}:`,
        processedImages.length,
        'images'
      );

      return processedImages;
    } catch (error) {
      console.error('[discoveryService] fetchRandomImageBatch failed:', error);
      throw error;
    }
  },
};
