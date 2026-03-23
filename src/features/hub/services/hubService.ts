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
  };
  profileImageUrl: string | null;
}

/**
 * Database query result type (internal)
 */
interface UserQuery {
  id: string;
  name: string;
  status: string | null;
  pronouns: string | null;
  major: string | null;
  interests: string[] | null;
  created_at: string;
}

interface ImageQuery {
  owner_id: string;
  storage_path: string;
}

export const hubService = {
  /**
   * Get all public users in an organization
   *
   * This function:
   * 1. Queries all public users in the organization
   * 2. Queries profile images for those users
   * 3. Merges results (handles users without images)
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
      // Query 1: Get all public users in the organization
      const { data: usersData, error: usersError } = await supabase
        .from("user")
        .select("id, name, status, pronouns, major, interests, created_at")
        .eq("org_id", orgId)
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

      if (usersError) {
        console.error("[hubService] Users query failed:", usersError);
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      if (!usersData || usersData.length === 0) {
        console.log("[hubService] No public users found for org:", orgId);
        return [];
      }

      // Query 2: Get profile images for these users
      const userIds = usersData.map((u) => u.id);
      const { data: imagesData, error: imagesError } = await supabase
        .from("image")
        .select("owner_id, storage_path")
        .in("owner_id", userIds)
        .eq("category", "profile")
        .eq("is_public", true);

      if (imagesError) {
        console.error("[hubService] Images query failed:", imagesError);
        // Continue without images rather than failing completely
      }

      // Create a map of user_id -> storage_path for easy lookup
      const imageMap = new Map<string, string>();
      if (imagesData) {
        imagesData.forEach((img: ImageQuery) => {
          // If multiple profile images exist, use the first one
          if (!imageMap.has(img.owner_id)) {
            imageMap.set(img.owner_id, img.storage_path);
          }
        });
      }

      // Merge users with their images and generate signed URLs
      const result: HubUserData[] = await Promise.all(
        usersData.map(async (user: UserQuery) => {
          const storagePath = imageMap.get(user.id);
          let profileImageUrl: string | null = null;

          if (storagePath) {
            try {
              profileImageUrl = await storageService.getPhotoUrl(storagePath);
            } catch (error) {
              console.warn(
                `[hubService] Failed to generate URL for user ${user.id}:`,
                error,
              );
              // Continue with null image URL
            }
          }

          return {
            user: {
              id: user.id,
              name: user.name,
              status: user.status,
              pronouns: user.pronouns,
              major: user.major,
              interests: user.interests,
              created_at: user.created_at,
            },
            profileImageUrl,
          };
        }),
      );

      console.log(
        `[hubService] Fetched ${result.length} users for org ${orgId}`,
      );

      return result;
    } catch (error) {
      console.error("[hubService] getAllOrgUsers failed:", error);
      throw error;
    }
  },
};
