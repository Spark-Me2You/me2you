/**
 * Discovery Service
 * API for matching gestures and fetching random profiles from the organization
 */

import { supabase } from "@/core/supabase/client";
import { storageService } from "@/core/supabase/storage";
import type { RandomImageData, UserProfile } from "../types/image";

type DiscoveryUserData = Pick<
  UserProfile,
  "id" | "name" | "status" | "pronouns" | "major" | "interests" | "created_at"
>;

export const discoveryService = {
  /**
   * Match gesture to profile
   * TODO: Implement gesture matching API call
   */
  matchGesture: async (_gestureEmbedding: number[]) => {
    // TODO: Send gesture embedding to backend for matching
    return null;
  },

  fetchRandomImage: async (
    orgId: string,
    category?: string,
  ): Promise<RandomImageData | null> => {
    if (!orgId) {
      throw new Error("Organization ID is required");
    }

    try {
      let query = supabase
        .from("gesture_image")                      // changed
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
            created_at
          )
        `,
        )
        .eq("org_id", orgId)
        .eq("is_public", true);

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[discoveryService] Database query failed:", error);
        throw new Error(`Failed to fetch images: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.log(
          "[discoveryService] No public images found for org:",
          orgId,
          category ? `with category: ${category}` : "(all categories)",
        );
        return null;
      }

      const randomIndex = Math.floor(Math.random() * data.length);
      const selectedImage = data[randomIndex];

      const rawUserData = Array.isArray(selectedImage.user)
        ? selectedImage.user[0]
        : selectedImage.user;

      const userData = rawUserData as DiscoveryUserData | null;

      if (!userData) {
        console.error(
          "[discoveryService] Image has no owner:",
          selectedImage.id,
        );
        throw new Error("Image owner data is missing");
      }

      const imageUrl = await storageService.getPhotoUrl(selectedImage.storage_path); // removed cropped_path fallback

      console.log(
        "[discoveryService] Random image selected:",
        selectedImage.id,
        "from",
        data.length,
        "available images",
      );

      return {
        image: {
          id: selectedImage.id,
          owner_id: selectedImage.owner_id,
          org_id: selectedImage.org_id,
          storage_path: selectedImage.storage_path,
          cropped_path: null,                       // removed, hardcoded to null
          category: selectedImage.category,
          is_public: selectedImage.is_public,
          created_at: selectedImage.created_at,
        },
        owner: {
          id: userData.id,
          org_id: selectedImage.org_id,
          name: userData.name,
          status: userData.status,
          pronouns: userData.pronouns ?? null,
          major: userData.major ?? null,
          interests: userData.interests ?? null,
          created_at: userData.created_at,
        },
        imageUrl,
      };
    } catch (error) {
      console.error("[discoveryService] fetchRandomImage failed:", error);
      throw error;
    }
  },

  getImageCount: async (orgId: string, category: string): Promise<number> => {
    if (!orgId || !category) {
      throw new Error("Organization ID and category are required");
    }

    try {
      const { count, error } = await supabase
        .from("gesture_image")                      // changed
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("category", category)
        .eq("is_public", true);

      if (error) {
        console.error("[discoveryService] Count query failed:", error);
        throw new Error(`Failed to count images: ${error.message}`);
      }

      console.log(
        `[discoveryService] Image count for ${category}:`,
        count ?? 0,
      );

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
        .from("gesture_image")                      // changed
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("category", category)
        .eq("is_public", true);

      const totalCount = count ?? 0;

      if (totalCount === 0) {
        console.log(
          `[discoveryService] No images found for batch: ${category}`,
        );
        return [];
      }

      const maxOffset = Math.max(0, totalCount - limit);
      const randomOffset = Math.floor(Math.random() * (maxOffset + 1));

      const { data, error } = await supabase
        .from("gesture_image")                      // changed
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
            created_at
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
        console.log(
          `[discoveryService] No images found for batch: ${category}`,
        );
        return [];
      }

      const shuffled = [...data];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const processedImages: RandomImageData[] = await Promise.all(
        shuffled.map(async (img) => {
          const rawUserData = Array.isArray(img.user) ? img.user[0] : img.user;
          const userData = rawUserData as DiscoveryUserData | null;

          if (!userData) {
            console.warn(
              "[discoveryService] Image missing owner data:",
              img.id,
            );
            throw new Error(`Image ${img.id} has no owner data`);
          }

          const imageUrl = await storageService.getPhotoUrl(img.storage_path); // removed cropped_path fallback

          return {
            image: {
              id: img.id,
              owner_id: img.owner_id,
              org_id: img.org_id,
              storage_path: img.storage_path,
              cropped_path: null,                   // removed, hardcoded to null
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
            },
            imageUrl,
          };
        }),
      );

      console.log(
        `[discoveryService] Fetched batch for ${category}:`,
        processedImages.length,
        "images",
      );

      return processedImages;
    } catch (error) {
      console.error("[discoveryService] fetchRandomImageBatch failed:", error);
      throw error;
    }
  },
};