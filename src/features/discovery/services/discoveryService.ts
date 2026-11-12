/**
 * Discovery Service
 * API for fetching random profiles from the organization
 */

import { supabase } from "@/core/supabase/client";
import { storageService } from "@/core/supabase/storage";
import type { RandomImageData, UserProfile } from "../types/image";

type DiscoveryUserData = Pick<
  UserProfile,
  "id" | "name" | "status" | "pronouns" | "major" | "interests" | "created_at" | "accessory"
>;

export const discoveryService = {
  getImageCount: async (orgId: string, category: string): Promise<number> => {
    if (!orgId || !category) {
      throw new Error("Organization ID and category are required");
    }

    try {
      const { count, error } = await supabase
        .from("gesture_image")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("category", category)
        .eq("is_public", true);

      if (error) {
        console.error("[discoveryService] Count query failed:", error);
        throw new Error(`Failed to count images: ${error.message}`);
      }

      return count ?? 0;
    } catch (error) {
      console.error("[discoveryService] getImageCount failed:", error);
      throw error;
    }
  },

  fetchRandomImageBatch: async (
    orgId: string,
    category: string,
    limit: number,
  ): Promise<RandomImageData[]> => {
    if (!orgId || !category) {
      throw new Error("Organization ID and category are required");
    }

    if (limit <= 0) {
      throw new Error("Limit must be greater than 0");
    }

    try {
      const { count } = await supabase
        .from("gesture_image")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("category", category)
        .eq("is_public", true);

      const totalCount = count ?? 0;

      if (totalCount === 0) {
        return [];
      }

      const maxOffset = Math.max(0, totalCount - limit);
      const randomOffset = Math.floor(Math.random() * (maxOffset + 1));

      const { data, error } = await supabase
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
        .eq("category", category)
        .eq("is_public", true)
        .order("id", { ascending: true })
        .range(randomOffset, randomOffset + limit - 1);

      if (error) {
        console.error("[discoveryService] Batch query failed:", error);
        throw new Error(`Failed to fetch image batch: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      const shuffled = [...data];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const withOwner = shuffled.flatMap((img) => {
        const rawUserData = Array.isArray(img.user) ? img.user[0] : img.user;
        const userData = rawUserData as DiscoveryUserData | null;
        if (!userData) {
          // One orphaned image must not fail the whole batch.
          console.warn("[discoveryService] Skipping image without owner data:", img.id);
          return [];
        }
        return [{ img, userData }];
      });

      const processedImages: RandomImageData[] = await Promise.all(
        withOwner.map(async ({ img, userData }) => {
          const imageUrl = await storageService.getPhotoUrl(img.storage_path);

          return {
            image: {
              id: img.id,
              owner_id: img.owner_id,
              org_id: img.org_id,
              storage_path: img.storage_path,
              cropped_path: null,
              category: img.category,
              is_public: img.is_public,
              created_at: img.created_at,
            },
            owner: {
              id: userData.id,
              org_id: img.org_id,
              name: userData.name,
              status: userData.status,
              pronouns: userData.pronouns ?? null,
              major: userData.major ?? null,
              interests: userData.interests ?? null,
              created_at: userData.created_at,
              accessory: userData.accessory ?? null,
            },
            imageUrl,
          };
        }),
      );

      return processedImages;
    } catch (error) {
      console.error("[discoveryService] fetchRandomImageBatch failed:", error);
      throw error;
    }
  },
};