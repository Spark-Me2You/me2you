/**
 * Cropped Image Service
 * Fetches cropped face images with landmark points, accessories, and pagination
 */

import { supabase } from '@/core/supabase/client';
import { accessoryService } from '@/features/profile-editor/services/accessoryService';
import type { AccessorySettings } from '@/features/profile-editor/types/profileTypes';

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
  accessorySettings: AccessorySettings | null;
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
  getCroppedImageById: async (
    id: string,
    orgId: string,
  ): Promise<CroppedImageRow | null> => {
    const { data, error } = await supabase
      .from('cropped_image')
      .select(
        'id, storage_path, owner_id, centroid_point, left_eye_point, right_eye_point, forehead_top_point',
      )
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('is_public', true)
      .maybeSingle();

    if (error || !data) return null;

    const ownerIds = [data.owner_id as string];
    const settingsMap = await accessoryService.getSettingsForOwners(ownerIds);

    return {
      id: data.id,
      storage_path: data.storage_path,
      owner_id: data.owner_id,
      centroid_point: parsePoint(data.centroid_point),
      left_eye_point: parsePoint(data.left_eye_point),
      right_eye_point: parsePoint(data.right_eye_point),
      forehead_top_point: parsePoint(data.forehead_top_point),
      accessorySettings: settingsMap.get(data.owner_id) ?? null,
    };
  },

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

      // Fetch accessory settings for all owners in this batch from the accessories table
      const ownerIds = rawRows.map((r: any) => r.owner_id as string);
      const settingsMap = await accessoryService.getSettingsForOwners(ownerIds);

      const rows: CroppedImageRow[] = rawRows.map((row: any) => ({
        id: row.id,
        storage_path: row.storage_path,
        owner_id: row.owner_id,
        centroid_point: parsePoint(row.centroid_point),
        left_eye_point: parsePoint(row.left_eye_point),
        right_eye_point: parsePoint(row.right_eye_point),
        forehead_top_point: parsePoint(row.forehead_top_point),
        accessorySettings: settingsMap.get(row.owner_id) ?? null,
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
