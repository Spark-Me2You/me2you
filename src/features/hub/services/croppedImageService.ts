/**
 * Cropped Image Service
 * Fetches cropped face images with centroid points in paginated batches
 */

import { supabase } from '@/core/supabase/client';

/**
 * Cropped image row with centroid, storage path, and owner info
 */
export interface CroppedImageRow {
  id: string;
  storage_path: string;
  owner_id: string;
  centroid_point: {
    x: number;
    y: number;
  } | null;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  hasMore: boolean;
  offset: number;
}

function parseCentroidPoint(raw: string | null): { x: number; y: number } | null {
  if (!raw) return null;
  const parts = raw.replace(/[()]/g, '').split(',');
  return {
    x: parseFloat(parts[0]),
    y: parseFloat(parts[1]),
  };
}

export const croppedImageService = {
  /**
   * Fetch a paginated batch of cropped images
   * Returns only centroid_point and storage_path columns
   *
   * @param orgId - Organization ID
   * @param offset - Pagination offset (0-based)
   * @param limit - Number of rows per batch (default 10)
   * @returns Array of cropped image rows and pagination metadata
   * @throws Error if query fails
   */
  getPaginatedCroppedImages: async (
    orgId: string,
    offset: number = 0,
    limit: number = 10
  ): Promise<{ rows: CroppedImageRow[]; pagination: PaginationMeta }> => {
    if (!orgId) {
      throw new Error('Organization ID is required');
    }

    try {
      const { data, error } = await supabase
        .from('cropped_image')
        .select('id, storage_path, owner_id, centroid_point', { count: 'exact' })
        .eq('org_id', orgId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[croppedImageService] Query failed:', error);
        throw new Error(`Failed to fetch cropped images: ${error.message}`);
      }

      const rows = (data || []).map((row: any) => ({
        ...row,
        centroid_point: parseCentroidPoint(row.centroid_point),
      })) as CroppedImageRow[];

      console.log(
        `[croppedImageService] Fetched ${rows.length} rows at offset ${offset}`
      );

      return {
        rows,
        pagination: {
          hasMore: rows.length === limit,
          offset: offset + limit,
        },
      };
    } catch (error) {
      console.error('[croppedImageService] getPaginatedCroppedImages failed:', error);
      throw error;
    }
  },
};