/**
 * Hub Service
 * Fetches all users in an organization for the Community Hub
 */

import { supabase } from "@/core/supabase/client";
import { storageService } from "@/core/supabase/storage";

/**
 * Hub User Data
 * User profile with optional profile image for hub display
 */
export interface HubUserData {
  user: {
    id: string;
    name: string;
    status: string | null;
    pronouns: string | null;
    major: string | null;
    interests: string[] | null;
    created_at: string;
    accessory: 'sunglasses' | 'hat' | 'balloon' | null;
  };
  profileImageUrl: string | null;
}

type UserProfileData = {
  id: string;
  name: string;
  status: string | null;
  pronouns: string | null;
  major: string | null;
  interests: string[] | null;
  created_at: string;
  accessory: 'sunglasses' | 'hat' | 'balloon' | null;
};

type UserRow = Omit<UserProfileData, 'accessory' | 'created_at'> & {
  accessory: string | null;
  created_at: string | null;
};

const USER_COLUMNS = "id, name, status, pronouns, major, interests, created_at, accessory";

/** Map a `user` row to the hub shape. */
function toHubUser(user: UserRow): HubUserData["user"] {
  return {
    id: user.id,
    name: user.name,
    status: user.status,
    pronouns: user.pronouns,
    major: user.major,
    interests: user.interests,
    // Column is nullable; fall back to the epoch so these sort last
    created_at: user.created_at ?? new Date(0).toISOString(),
    accessory: (user.accessory as 'sunglasses' | 'hat' | 'balloon' | null) ?? null,
  };
}

export const hubService = {
  /**
   * Get all public users in an organization
   *
   * This function follows the same image fetching pattern as discoveryService:
   * 1. Queries images table with joined user data (users WITH profile images)
   * 2. Queries user table for users WITHOUT profile images
   * 3. Merges both lists
   * 4. Generates signed URLs for images
   * 5. Returns sorted by most recent (created_at DESC)
   *
   * @param orgId - Organization ID from kiosk session
   * @returns Array of users with their profile images
   * @throws Error if database query fails
   */
  getAllOrgUsers: async (orgId: string): Promise<HubUserData[]> => {
    if (!orgId) {
      throw new Error("Organization ID is required");
    }

    try {
      // Step 1: Query images with joined user data (following discoveryService pattern)
      // This gets all users who HAVE profile images
      const { data: imagesData, error: imagesError } = await supabase
        .from("gesture_image")
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
            name,
            status,
            pronouns,
            major,
            interests,
            created_at,
            accessory
          )
        `,
        )
        .eq("org_id", orgId)
        .eq("is_public", true);

      if (imagesError) {
        console.error("[hubService] Images query failed:", imagesError);
        throw new Error(`Failed to fetch images: ${imagesError.message}`);
      }


      // Step 2: Pick the first image per user synchronously (before any await), so which
      // image wins doesn't depend on the order signed URLs resolve in.
      const firstImages = new Map<string, { userData: UserProfileData; storagePath: string }>();
      for (const img of imagesData ?? []) {
        // Extract user data (Supabase returns as array or object)
        const rawUserData = Array.isArray(img.user) ? img.user[0] : img.user;
        const userData = rawUserData as UserProfileData | null;

        if (!userData) {
          console.warn("[hubService] Image missing user data:", img.id);
          continue;
        }
        if (!firstImages.has(userData.id)) {
          firstImages.set(userData.id, { userData, storagePath: img.storage_path });
        }
      }

      // Then sign the URLs.
      const usersWithImages = new Map<string, HubUserData>();
      await Promise.all(
        [...firstImages.values()].map(async ({ userData, storagePath }) => {
          let profileImageUrl: string | null = null;
          try {
            profileImageUrl = await storageService.getPhotoUrl(storagePath);
          } catch (error) {
            console.warn(
              `[hubService] Failed to generate URL for ${userData.name}:`,
              error,
            );
          }
          usersWithImages.set(userData.id, {
            user: toHubUser(userData),
            profileImageUrl,
          });
        }),
      );

      // Step 3: Query for users WITHOUT profile images
      const { data: allUsersData, error: usersError } = await supabase
        .from("user")
        .select(USER_COLUMNS)
        .eq("org_id", orgId)
        .eq("visibility", "public");

      if (usersError) {
        console.error("[hubService] Users query failed:", usersError);
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }


      // Step 4: Merge results
      const result: HubUserData[] = [];

      if (allUsersData) {
        for (const user of allUsersData) {
          if (usersWithImages.has(user.id)) {
            // User has a profile image, use the data we already have
            result.push(usersWithImages.get(user.id)!);
          } else {
            // User doesn't have a profile image, add them with null URL
            result.push({
              user: toHubUser(user),
              profileImageUrl: null,
            });
          }
        }
      }

      // Step 5: Sort by most recent (created_at DESC)
      result.sort((a, b) => {
        return (
          new Date(b.user.created_at).getTime() -
          new Date(a.user.created_at).getTime()
        );
      });


      return result;
    } catch (error) {
      console.error("[hubService] getAllOrgUsers failed:", error);
      throw error;
    }
  },

  /**
   * Get one public user in an organization, with a signed profile image URL.
   *
   * @returns The user, or null if they don't exist or aren't public
   * @throws Error if a database query fails
   */
  getUserById: async (ownerId: string, orgId: string): Promise<HubUserData | null> => {
    if (!ownerId || !orgId) {
      throw new Error("Owner ID and Organization ID are required");
    }

    const { data: userRow, error: userError } = await supabase
      .from("user")
      .select(USER_COLUMNS)
      .eq("id", ownerId)
      .eq("org_id", orgId)
      .eq("visibility", "public")
      .maybeSingle();

    if (userError) {
      console.error("[hubService] User query failed:", userError);
      throw new Error(`Failed to fetch user: ${userError.message}`);
    }
    if (!userRow) return null;

    const { data: imageRow, error: imageError } = await supabase
      .from("gesture_image")
      .select("storage_path")
      .eq("owner_id", ownerId)
      .eq("org_id", orgId)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (imageError) {
      console.warn("[hubService] Image query failed:", imageError);
    }

    let profileImageUrl: string | null = null;
    if (imageRow?.storage_path) {
      try {
        profileImageUrl = await storageService.getPhotoUrl(imageRow.storage_path);
      } catch (error) {
        console.warn("[hubService] Failed to generate image URL:", error);
      }
    }

    return { user: toHubUser(userRow), profileImageUrl };
  },

  /**
   * Get gesture_image storage path by owner_id
   * Used to fetch the full photo for profile display
   *
   * @param ownerId - User ID
   * @param orgId - Organization ID
   * @returns Storage path or null if not found
   */
  getGestureImageByOwnerId: async (
    ownerId: string,
    orgId: string,
  ): Promise<string | null> => {
    if (!ownerId || !orgId) {
      throw new Error("Owner ID and Organization ID are required");
    }

    try {
      const { data, error } = await supabase
        .from("gesture_image")
        .select("storage_path")
        .eq("owner_id", ownerId)
        .eq("org_id", orgId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "[hubService] Failed to fetch gesture_image:",
          error,
        );
        return null;
      }

      return data?.storage_path || null;
    } catch (error) {
      console.error("[hubService] getGestureImageByOwnerId failed:", error);
      return null;
    }
  },
};
