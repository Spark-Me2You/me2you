/**
 * Cropped Image Service
 * Fetches cropped face images with landmark points, accessories, and pagination
 */

import { supabase } from '@/core/supabase/client';
import type { Accessory } from '@/core/auth/AuthContext';

/**
 * Cropped image row with landmark points, storage path, and owner info
 */
export interface CroppedImageRow {
  id: string;
  storage_path: string;
  owner_id: string;
  centroid_point: { x: number; y: number } | null;
  left_eye_point: { x: number; y: number } | null;
  right_eye_point: { x: number; y: number } | null;
  forehead_top_point: { x: number; y: number } | null;
  accessory: Accessory | null;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  hasMore: boolean;
  offset: number;
}

function parsePoint(raw: string | null): { x: number; y: number } | null {
  if (!raw) return null;
  const parts = raw.replace(/[()]/g, '').split(',');
  return {
    x: parseFloat(parts[0]),
    y: parseFloat(parts[1]),
  };
}

export const croppedImageService = {
  /**
   * Fetch a paginated batch of cropped images including face landmarks and user accessory.
   * Makes two queries: one for cropped_image rows, one for the owners' accessories.
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
        .select(
          'id, storage_path, owner_id, centroid_point, left_eye_point, right_eye_point, forehead_top_point',
          { count: 'exact' }
        )
        .eq('org_id', orgId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('[croppedImageService] Query failed:', error);
        throw new Error(`Failed to fetch cropped images: ${error.message}`);
      }

      const rawRows = data || [];

      // Fetch accessories for all owners in this batch
      const ownerIds = rawRows.map((r: any) => r.owner_id as string);
      let accessoryMap = new Map<string, Accessory | null>();

      if (ownerIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('id, accessory')
          .in('id', ownerIds);

        if (userError) {
          console.warn('[croppedImageService] Failed to fetch user accessories:', userError);
        } else {
          accessoryMap = new Map(
            (userData || []).map((u: any) => [u.id as string, (u.accessory as Accessory | null)])
          );
        }
      }

      const rows: CroppedImageRow[] = rawRows.map((row: any) => ({
        id: row.id,
        storage_path: row.storage_path,
        owner_id: row.owner_id,
        centroid_point: parsePoint(row.centroid_point),
        left_eye_point: parsePoint(row.left_eye_point),
        right_eye_point: parsePoint(row.right_eye_point),
        forehead_top_point: parsePoint(row.forehead_top_point),
        accessory: accessoryMap.get(row.owner_id) ?? null,
      }));

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
