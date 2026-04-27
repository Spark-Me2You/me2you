import { supabase } from '@/core/supabase/client';
import type { AccessorySettings } from '@/features/profile-editor/types/profileTypes';
import { croppedImageService, type CroppedImageRow } from './croppedImageService';

export const hubRealtimeService = {
  subscribeToNewCroppedImages: (
    orgId: string,
    onInsert: (row: CroppedImageRow) => void,
  ): (() => void) => {
    const channelName = `hub-cropped-image-${orgId}`;
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      supabase.removeChannel(channel);
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cropped_image' },
        async (event) => {
          const raw = event.new as { id: string; org_id: string };
          if (raw.org_id !== orgId) return;
          const row = await croppedImageService.getCroppedImageById(raw.id, orgId);
          if (row) onInsert(row);
        },
      )
      .subscribe((status, err) => {
        if (err) console.error(`[realtime] ${channelName} error:`, err);
        else console.log(`[realtime] ${channelName} ${status}`);
      });

    return remove;
  },

  subscribeToAccessoryUpdates: (
    orgId: string,
    onUpdate: (ownerId: string, settings: AccessorySettings) => void,
  ): (() => void) => {
    const channelName = `hub-accessories-${orgId}`;
    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      supabase.removeChannel(channel);
    };

    const handleEvent = (event: { new: Record<string, unknown> }) => {
      const raw = event.new as {
        org_id: string;
        user_id: string;
        selected_accessory: 'sunglasses' | 'hat' | 'balloon' | null;
        relative_x: number;
        relative_y: number;
        scale: number;
      };
      if (raw.org_id !== orgId) return;
      onUpdate(raw.user_id, {
        selected_accessory: raw.selected_accessory,
        relative_x: raw.relative_x ?? 0,
        relative_y: raw.relative_y ?? 0,
        scale: raw.scale ?? 1,
      });
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'accessories' },
        handleEvent,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'accessories' },
        handleEvent,
      )
      .subscribe((status, err) => {
        if (err) console.error(`[realtime] ${channelName} error:`, err);
        else console.log(`[realtime] ${channelName} ${status}`);
      });

    return remove;
  },
};
