/**
 * In-memory cache of the signed-in user's profile and accessory settings.
 *
 * The profile page and the customize page each fetched everything on every
 * visit (3 queries, then 2 signed URLs, then the images), so moving between
 * them showed a loading screen each time. Pages now render the cached copy
 * immediately and refresh it in the background ("stale-while-revalidate").
 *
 * Reusing the cached signed URLs also lets the browser reuse the images it
 * already downloaded; a freshly signed URL has a new token and misses the
 * browser cache. Entries expire well before the URLs do (they're signed for
 * an hour).
 *
 * Memory only, keyed by user id, and cleared on sign-out, so one person's
 * data is never shown to another on a shared phone.
 */

import type { AccessorySettings, ProfileWithImage } from "../types/profileTypes";

const MAX_AGE_MS = 45 * 60 * 1000;

interface Entry<T> {
  userId: string;
  value: T;
  savedAt: number;
}

let profileEntry: Entry<ProfileWithImage> | null = null;
let accessoryEntry: Entry<AccessorySettings> | null = null;

function read<T>(entry: Entry<T> | null, userId: string | null | undefined): T | null {
  if (!entry || !userId || entry.userId !== userId) return null;
  if (Date.now() - entry.savedAt > MAX_AGE_MS) return null;
  return entry.value;
}

export const profileCache = {
  getProfile: (userId: string | null | undefined) => read(profileEntry, userId),

  setProfile: (userId: string, value: ProfileWithImage) => {
    profileEntry = { userId, value, savedAt: Date.now() };
  },

  getAccessorySettings: (userId: string | null | undefined) => read(accessoryEntry, userId),

  setAccessorySettings: (userId: string, value: AccessorySettings) => {
    accessoryEntry = { userId, value, savedAt: Date.now() };
  },

  clear: () => {
    profileEntry = null;
    accessoryEntry = null;
  },
};
