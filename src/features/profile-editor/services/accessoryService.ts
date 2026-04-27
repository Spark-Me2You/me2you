import { supabase } from '@/core/supabase/client';
import type { Accessory } from '@/core/auth/AuthContext';
import type { AccessorySettings } from '../types/profileTypes';
import { DEFAULT_ACCESSORY_SETTINGS } from '../types/profileTypes';

function rowToSettings(row: Record<string, unknown>): AccessorySettings {
  return {
    selected_accessory: (row.selected_accessory as Accessory | null) ?? null,
    relative_x: typeof row.relative_x === 'number' ? row.relative_x : 0,
    relative_y: typeof row.relative_y === 'number' ? row.relative_y : 0,
    scale: typeof row.scale === 'number' ? row.scale : 1,
  };
}

export const accessoryService = {
  getAccessorySettings: async (userId: string): Promise<AccessorySettings> => {
    const { data, error } = await supabase
      .from('accessories')
      .select('selected_accessory, relative_x, relative_y, scale')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[accessoryService] Failed to fetch settings:', error);
      return DEFAULT_ACCESSORY_SETTINGS;
    }

    return data ? rowToSettings(data as Record<string, unknown>) : DEFAULT_ACCESSORY_SETTINGS;
  },

  upsertAccessorySettings: async (
    userId: string,
    orgId: string,
    settings: AccessorySettings,
  ): Promise<void> => {
    const { error } = await supabase
      .from('accessories')
      .upsert(
        {
          user_id: userId,
          org_id: orgId,
          selected_accessory: settings.selected_accessory,
          relative_x: settings.relative_x,
          relative_y: settings.relative_y,
          scale: settings.scale,
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      throw new Error(`Failed to save accessory settings: ${error.message}`);
    }
  },

  getSettingsForOwners: async (
    ownerIds: string[],
  ): Promise<Map<string, AccessorySettings>> => {
    if (ownerIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from('accessories')
      .select('user_id, selected_accessory, relative_x, relative_y, scale')
      .in('user_id', ownerIds);

    if (error) {
      console.warn('[accessoryService] Failed to fetch settings for owners:', error);
      return new Map();
    }

    return new Map(
      (data || []).map((row) => [
        row.user_id as string,
        rowToSettings(row as Record<string, unknown>),
      ]),
    );
  },
};
