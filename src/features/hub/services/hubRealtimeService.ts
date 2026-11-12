import { supabase } from '@/core/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { AccessorySettings } from '@/features/profile-editor/types/profileTypes';
import { croppedImageService, type CroppedImageRow } from './croppedImageService';

/** Delay before the first resubscribe attempt; doubles per failed attempt up to the cap. */
export const RESUBSCRIBE_BASE_DELAY_MS = 1_000;
export const RESUBSCRIBE_MAX_DELAY_MS = 30_000;

interface TableListener {
  event: 'INSERT' | 'UPDATE';
  table: 'cropped_image' | 'accessories';
  handler: (event: { new: Record<string, unknown> }) => unknown;
}

/**
 * Subscribe to postgres changes for one org. The server filters on `org_id`; handlers also
 * check it, since the filter is a performance and privacy measure, not the only guard.
 * If the channel errors, times out or closes, it is rebuilt with capped exponential backoff
 * until the returned unsubscribe function is called.
 */
function subscribeToOrgChanges(
  channelName: string,
  orgId: string,
  listeners: TableListener[],
): () => void {
  let removed = false;
  let channel: RealtimeChannel | null = null;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    retryTimer = null;
    const current: RealtimeChannel = supabase.channel(channelName);
    channel = current;

    for (const { event, table, handler } of listeners) {
      current.on(
        'postgres_changes',
        { event, schema: 'public', table, filter: `org_id=eq.${orgId}` },
        (payload: { new: Record<string, unknown> }) => {
          if (removed || payload.new.org_id !== orgId) return;
          return handler(payload);
        },
      );
    }

    current.subscribe((status, err) => {
      // A rebuilt channel's predecessor may still report its own closing.
      if (removed || channel !== current) return;

      if (status === 'SUBSCRIBED') {
        attempt = 0;
        return;
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        const delay = Math.min(RESUBSCRIBE_BASE_DELAY_MS * 2 ** attempt, RESUBSCRIBE_MAX_DELAY_MS);
        attempt++;
        console.warn(`[realtime] ${channelName} ${status}${err ? `: ${err.message}` : ''}; retrying in ${delay}ms`);
        supabase.removeChannel(current);
        retryTimer = setTimeout(connect, delay);
      }
    });
  };

  connect();

  return () => {
    if (removed) return;
    removed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (channel) supabase.removeChannel(channel);
  };
}

export const hubRealtimeService = {
  subscribeToNewCroppedImages: (
    orgId: string,
    onInsert: (row: CroppedImageRow) => void,
  ): (() => void) => {
    let removed = false;
    const unsubscribe = subscribeToOrgChanges(`hub-cropped-image-${orgId}`, orgId, [
      {
        event: 'INSERT',
        table: 'cropped_image',
        handler: async (event) => {
          const row = await croppedImageService.getCroppedImageById(event.new.id as string, orgId);
          if (removed || !row) return;
          onInsert(row);
        },
      },
    ]);
    return () => {
      removed = true;
      unsubscribe();
    };
  },

  subscribeToProfilePictureUpdates: (
    orgId: string,
    onUpdate: (ownerId: string, storagePath: string) => void,
  ): (() => void) =>
    subscribeToOrgChanges(`hub-cropped-image-update-${orgId}`, orgId, [
      {
        event: 'UPDATE',
        table: 'cropped_image',
        handler: (event) => {
          const raw = event.new as { owner_id: string; storage_path: string };
          onUpdate(raw.owner_id, raw.storage_path);
        },
      },
    ]),

  subscribeToAccessoryUpdates: (
    orgId: string,
    onUpdate: (ownerId: string, settings: AccessorySettings) => void,
  ): (() => void) => {
    const handler: TableListener['handler'] = (event) => {
      const raw = event.new as {
        user_id: string;
        selected_accessory: 'sunglasses' | 'hat' | 'balloon' | null;
        relative_x: number;
        relative_y: number;
        scale: number;
      };
      onUpdate(raw.user_id, {
        selected_accessory: raw.selected_accessory,
        relative_x: raw.relative_x ?? 0,
        relative_y: raw.relative_y ?? 0,
        scale: raw.scale ?? 1,
      });
    };

    return subscribeToOrgChanges(`hub-accessories-${orgId}`, orgId, [
      { event: 'INSERT', table: 'accessories', handler },
      { event: 'UPDATE', table: 'accessories', handler },
    ]);
  },
};
