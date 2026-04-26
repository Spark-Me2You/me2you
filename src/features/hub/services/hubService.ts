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

      console.log(
        "[hubService] Found profile images:",
        imagesData?.length || 0,
      );

      // Step 2: Process users with images
      const usersWithImages = new Map<string, HubUserData>();

      if (imagesData && imagesData.length > 0) {
        await Promise.all(
          imagesData.map(async (img) => {
            // Extract user data (Supabase returns as array or object)
            const rawUserData = Array.isArray(img.user)
              ? img.user[0]
              : img.user;
            const userData = rawUserData as UserProfileData | null;

            if (!userData) {
              console.warn("[hubService] Image missing user data:", img.id);
              return;
            }

            // Skip if we already have this user (keep first image found)
            if (usersWithImages.has(userData.id)) {
              return;
            }

            // Generate signed URL for the image
            let profileImageUrl: string | null = null;
            try {
              profileImageUrl = await storageService.getPhotoUrl(
                img.storage_path,
              );
              console.log(
                `[hubService] Generated URL for ${userData.name}:`,
                profileImageUrl?.substring(0, 100),
              );
            } catch (error) {
              console.warn(
                `[hubService] Failed to generate URL for ${userData.name}:`,
                error,
              );
            }

            usersWithImages.set(userData.id, {
              user: {
                id: userData.id,
                name: userData.name,
                status: userData.status,
                pronouns: userData.pronouns,
                major: userData.major,
                interests: userData.interests,
                created_at: userData.created_at,
                accessory: userData.accessory ?? null,
              },
              profileImageUrl,
            });
          }),
        );
      }

      console.log(
        "[hubService] Processed users with images:",
        usersWithImages.size,
      );

      // Step 3: Query for users WITHOUT profile images
      const { data: allUsersData, error: usersError } = await supabase
        .from("user")
        .select("id, name, status, pronouns, major, interests, created_at, accessory")
        .eq("org_id", orgId)
        .eq("visibility", "public");

      if (usersError) {
        console.error("[hubService] Users query failed:", usersError);
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      console.log("[hubService] Total public users:", allUsersData?.length || 0);

      // Step 4: Merge results
      const result: HubUserData[] = [];

      if (allUsersData) {
        for (const user of allUsersData) {
          if (usersWithImages.has(user.id)) {
            // User has a profile image, use the data we already have
            result.push(usersWithImages.get(user.id)!);
          } else {
            // User doesn't have a profile image, add them with null URL
            console.log(
              `[hubService] User without profile image: ${user.name}`,
            );
            result.push({
              user: {
                id: user.id,
                name: user.name,
                status: user.status,
                pronouns: user.pronouns,
                major: user.major,
                interests: user.interests,
                created_at: user.created_at,
                accessory: (user.accessory as 'sunglasses' | 'hat' | 'balloon' | null) ?? null,
              },
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

      console.log(
        `[hubService] Final result: ${result.length} users (${usersWithImages.size} with images, ${result.length - usersWithImages.size} without)`,
      );

      return result;
    } catch (error) {
      console.error("[hubService] getAllOrgUsers failed:", error);
      throw error;
    }
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
        .single();

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
