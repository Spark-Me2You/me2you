/**
 * Garment store
 * The one interface the clothesline UI, the hub and the mobile wardrobe talk
 * to, implemented by supabaseGarmentStore (`garments` table + bucket from
 * migration 034).
 * Reads fail soft (empty results) so a missing table never breaks the hub or
 * the home screen.
 */

import type { CapturedGarment, Garment, GarmentWithUrl } from "../types";

export interface GarmentStore {
  /** Newest garments on the org's clothesline. */
  listLine(orgId: string, limit: number): Promise<GarmentWithUrl[]>;
  /** Save fresh cutouts to the line. Throws if nothing could be saved. */
  hang(orgId: string, pieces: CapturedGarment[]): Promise<Garment[]>;
  /** Garments a user has claimed, newest first. */
  listMine(userId: string): Promise<GarmentWithUrl[]>;
  /** Take a garment off the line for good (owners only on Supabase). */
  remove(garment: Garment): Promise<void>;
  /** The top each of these users' miis is wearing, keyed by user id. */
  getEquipped(userIds: string[]): Promise<Record<string, GarmentWithUrl>>;
  /** Wear a claimed top, or pass null to take it off. */
  setEquipped(userId: string, orgId: string, garmentId: string | null): Promise<void>;
  /** Called whenever this browser changes the line. Returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
}

const listeners = new Set<() => void>();

/** Change notifications: fired when this browser changes the line. */
export const lineChanges = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  notify(): void {
    listeners.forEach((listener) => listener());
  },
};
