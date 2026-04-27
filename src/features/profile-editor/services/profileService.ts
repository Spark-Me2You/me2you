/**
 * Profile Service
 * CRUD operations for user profiles and profile photos
 */

import { supabase } from "@/core/supabase/client";
import { storageService } from "@/core/supabase/storage";
import {
  faceCropService,
  FaceNotDetectedError,
} from "@/features/registration/services/faceCropService";
import { registrationService } from "@/features/registration/services/registrationService";
import type { UserProfile } from "@/core/auth/AuthContext";
import type {
  AvatarLandmarkPoints,
  UpdateProfileInput,
  ProfileWithImage,
  DeleteImagesResponse,
  DeleteAccountResponse,
} from "../types/profileTypes";

const PROFILE_QUERY_TIMEOUT_MS = 8000;
const STORAGE_SIGNED_URL_TIMEOUT_MS = 8000;
const DELETE_IMAGES_TIMEOUT_MS = 10000;
const PHOTO_UPLOAD_TIMEOUT_MS = 15000;
const BOBBLEHEAD_STEP_TIMEOUT_MS = 15000;
const SESSION_REFRESH_LEEWAY_MS = 120000;
const SESSION_PRECHECK_TIMEOUT_MS = 2500;
const MAX_TRANSIENT_RETRIES = 1;

const withTimeout = async <T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
};

const isNearSessionExpiry = (expiresAtSeconds?: number | null): boolean => {
  if (!expiresAtSeconds) {
    return true;
  }

  const expiresInMs = expiresAtSeconds * 1000 - Date.now();
  return expiresInMs <= SESSION_REFRESH_LEEWAY_MS;
};

const isTransientSaveError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("timed out") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("abort")
  );
};

const parsePoint = (raw: unknown): { x: number; y: number } | null => {
  if (!raw) return null;

  if (typeof raw === "string") {
    const parts = raw.replace(/[()]/g, "").split(",");
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }

  if (typeof raw === "object" && raw !== null) {
    const point = raw as { x?: unknown; y?: unknown };
    if (typeof point.x === "number" && typeof point.y === "number") {
      return { x: point.x, y: point.y };
    }
  }

  return null;
};

const ensureFreshSession = async (
  knownExpiresAt?: number | null,
): Promise<void> => {
  if (!isNearSessionExpiry(knownExpiresAt)) {
    return;
  }

  try {
    const { data: sessionData, error: sessionError } = await withTimeout(
      supabase.auth.getSession(),
      SESSION_PRECHECK_TIMEOUT_MS,
      "Get auth session",
    );

    if (sessionError) {
      throw new Error(`Authentication check failed: ${sessionError.message}`);
    }

    const currentSession = sessionData.session;
    const shouldRefresh =
      !currentSession || isNearSessionExpiry(currentSession.expires_at);

    if (!shouldRefresh) {
      return;
    }

    const { data: refreshedData, error: refreshError } = await withTimeout(
      supabase.auth.refreshSession(),
      PROFILE_QUERY_TIMEOUT_MS,
      "Refresh auth session",
    );

    if (refreshError || !refreshedData.session) {
      throw new Error("Session expired. Please sign in again and retry.");
    }
  } catch (error) {
    if (
      knownExpiresAt &&
      !isNearSessionExpiry(knownExpiresAt) &&
      isTransientSaveError(error)
    ) {
      return;
    }

    throw error;
  }
};

const withTransientRetry = async <T>(
  run: () => Promise<T>,
  beforeRetry?: () => Promise<void>,
): Promise<T> => {
  let attempt = 0;

  while (attempt <= MAX_TRANSIENT_RETRIES) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= MAX_TRANSIENT_RETRIES || !isTransientSaveError(error)) {
        throw error;
      }

      attempt += 1;

      if (beforeRetry) {
        await beforeRetry();
      }
    }
  }

  throw new Error("Operation failed");
};

export const profileService = {
  /**
   * Get current user's profile with profile image
   * @returns Promise with profile data and image URL, or null if not found
   */
  getCurrentProfile: async (options?: {
    userId?: string | null;
  }): Promise<ProfileWithImage | null> => {
    let userId = options?.userId ?? null;

    if (!userId) {
      const {
        data: { session },
        error: sessionError,
      } = await withTimeout(
        supabase.auth.getSession(),
        PROFILE_QUERY_TIMEOUT_MS,
        "Get current session",
      );

      if (sessionError) {
        throw new Error(
          `Failed to get current session: ${sessionError.message}`,
        );
      }

      userId = session?.user?.id ?? null;
    }

    if (!userId) return null;

    const [profileResponse, imageResponse, bobbleheadResponse] =
      await Promise.all([
        withTimeout(
          supabase.from("user").select("*").eq("id", userId).single(),
          PROFILE_QUERY_TIMEOUT_MS,
          "Fetch profile",
        ),
        withTimeout(
          supabase
            .from("gesture_image")
            .select("id, storage_path")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          PROFILE_QUERY_TIMEOUT_MS,
          "Fetch profile image",
        ),
        withTimeout(
          supabase
            .from("cropped_image")
            .select(
              "id, storage_path, centroid_point, left_eye_point, right_eye_point, forehead_top_point",
            )
            .eq("owner_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          PROFILE_QUERY_TIMEOUT_MS,
          "Fetch bobblehead image",
        ),
      ]);

    const { data: profile, error: profileError } = profileResponse;

    if (profileError || !profile) {
      console.error("[profileService] Failed to fetch profile:", profileError);
      return null;
    }

    const imageData = imageResponse.data;
    const bobbleheadData = bobbleheadResponse.data;
    const bobbleheadLandmarks: AvatarLandmarkPoints | null = bobbleheadData
      ? {
          centroid_point: parsePoint(bobbleheadData.centroid_point),
          left_eye_point: parsePoint(bobbleheadData.left_eye_point),
          right_eye_point: parsePoint(bobbleheadData.right_eye_point),
          forehead_top_point: parsePoint(bobbleheadData.forehead_top_point),
        }
      : null;

    const [imageUrl, bobbleheadUrl] = await Promise.all([
      imageData?.storage_path
        ? withTimeout(
            storageService.getPhotoUrl(imageData.storage_path),
            STORAGE_SIGNED_URL_TIMEOUT_MS,
            "Get profile photo URL",
          ).catch((e) => {
            console.warn("[profileService] Failed to get image URL:", e);
            return null;
          })
        : Promise.resolve(null),
      bobbleheadData?.storage_path
        ? withTimeout(
            storageService.getPhotoUrl(bobbleheadData.storage_path),
            STORAGE_SIGNED_URL_TIMEOUT_MS,
            "Get bobblehead URL",
          ).catch((e) => {
            console.warn("[profileService] Failed to get bobblehead URL:", e);
            return null;
          })
        : Promise.resolve(null),
    ]);

    return {
      profile: profile as UserProfile,
      imageUrl,
      imageStoragePath: imageData?.storage_path || null,
      imageId: imageData?.id || null,
      bobbleheadUrl,
      bobbleheadStoragePath: bobbleheadData?.storage_path || null,
      bobbleheadId: bobbleheadData?.id || null,
      bobbleheadLandmarks,
    };
  },

  /**
   * Update profile fields (not photo)
   * @param userId - User ID to update
   * @param data - Profile fields to update
   * @returns Promise with updated profile
   * @throws Error if update fails
   */
  updateProfile: async (
    userId: string,
    data: UpdateProfileInput,
    options?: { sessionExpiresAt?: number | null },
  ): Promise<UserProfile> => {
    const sessionExpiresAt = options?.sessionExpiresAt;
    await ensureFreshSession(sessionExpiresAt);

    return withTransientRetry(
      async () => {
        const { data: updated, error } = await withTimeout(
          supabase
            .from("user")
            .update({
              ...data,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId)
            .select()
            .single(),
          PROFILE_QUERY_TIMEOUT_MS,
          "Profile update request",
        );

        if (error) {
          console.error("[profileService] Failed to update profile:", error);
          throw new Error(`Failed to update profile: ${error.message}`);
        }

        return updated as UserProfile;
      },
      () => ensureFreshSession(sessionExpiresAt),
    );
  },

  /**
   * Update/replace profile photo with gesture category and generate bobblehead
   * @param photo - Photo blob to upload
   * @param userId - User ID
   * @param orgId - Organization ID
   * @param category - Gesture category (wave, peace_sign, thumbs_up)
   * @param existingImageId - Optional existing image ID to delete
   * @param existingStoragePath - Optional existing storage path to delete
   * @returns Promise with new image ID, storage path, and optional bobblehead error
   * @throws Error if photo upload fails (bobblehead errors are non-blocking)
   */
  updatePhoto: async (
    photo: Blob,
    userId: string,
    orgId: string,
    category: string,
    existingImageId?: string | null,
    existingStoragePath?: string | null,
    options?: { sessionExpiresAt?: number | null },
  ): Promise<{
    id: string;
    storage_path: string;
    bobbleheadError?: string;
  }> => {
    const sessionExpiresAt = options?.sessionExpiresAt;
    await ensureFreshSession(sessionExpiresAt);

    // Delete existing photo if present
    if (existingImageId && existingStoragePath) {
      try {
        await profileService.deletePhoto(existingImageId, existingStoragePath);
      } catch (e) {
        console.warn(
          "[profileService] Failed to delete old photo, continuing anyway:",
          e,
        );
      }
    }

    // Purge old gesture + cropped images before uploading new ones
    try {
      await withTimeout(
        profileService.deleteAllImages(),
        DELETE_IMAGES_TIMEOUT_MS,
        "Clear old images",
      );
    } catch (e) {
      console.warn(
        "[profileService] Failed to clear old gesture/cropped images, continuing anyway:",
        e,
      );
    }

    // Upload new photo
    const storagePath = await withTimeout(
      storageService.uploadPhoto(photo, userId, orgId),
      PHOTO_UPLOAD_TIMEOUT_MS,
      "Upload profile photo",
    );

    // Create new image record
    const { data, error } = await withTransientRetry(
      async () =>
        withTimeout(
          supabase
            .from("gesture_image")
            .insert({
              owner_id: userId,
              org_id: orgId,
              storage_path: storagePath,
              category: category,
              is_public: true,
            })
            .select("id, storage_path")
            .single(),
          PROFILE_QUERY_TIMEOUT_MS,
          "Create profile image record",
        ),
      () => ensureFreshSession(sessionExpiresAt),
    );

    if (error) {
      console.error("[profileService] Failed to create image record:", error);
      throw new Error(`Failed to create image record: ${error.message}`);
    }

    // Try to generate bobblehead (non-blocking - don't throw on error)
    let bobbleheadError: string | undefined;
    try {
      console.log("[profileService] Generating bobblehead from photo...");
      const cropResult = await withTimeout(
        faceCropService.cropFace(photo),
        BOBBLEHEAD_STEP_TIMEOUT_MS,
        "Generate bobblehead crop",
      );

      if (cropResult.cropMetadata.landmarks) {
        await withTimeout(
          registrationService.uploadCroppedPhotoWithLandmarks(
            cropResult.croppedBlob,
            userId,
            orgId,
            cropResult.cropMetadata.landmarks,
          ),
          BOBBLEHEAD_STEP_TIMEOUT_MS,
          "Upload bobblehead image",
        );
        console.log("[profileService] Bobblehead generated successfully");
      } else {
        bobbleheadError = "No face landmarks detected";
        console.warn(
          "[profileService] Bobblehead generation failed:",
          bobbleheadError,
        );
      }
    } catch (e) {
      if (e instanceof FaceNotDetectedError) {
        bobbleheadError = "No face detected in photo";
      } else {
        bobbleheadError =
          e instanceof Error ? e.message : "Bobblehead generation failed";
      }
      console.warn(
        "[profileService] Bobblehead generation failed:",
        bobbleheadError,
      );
    }

    return {
      ...data,
      bobbleheadError,
    };
  },

  /**
   * Delete photo from storage and database
   * @param imageId - Image record ID in database
   * @param storagePath - Storage path to delete
   * @throws Error if deletion fails
   */
  deletePhoto: async (imageId: string, storagePath: string): Promise<void> => {
    // Delete from storage
    try {
      await storageService.deletePhoto(storagePath);
    } catch (e) {
      console.warn("[profileService] Failed to delete from storage:", e);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("gesture_image")
      .delete()
      .eq("id", imageId);

    if (dbError) {
      console.error("[profileService] Failed to delete image record:", dbError);
      throw new Error(`Failed to delete image record: ${dbError.message}`);
    }
  },

  /**
   * Delete all gesture and cropped images for the current user via edge function.
   * Leaves the user account and profile photo (gesture_image table) intact.
   */
  deleteAllImages: async (): Promise<{
    gesture_rows_deleted: number;
    cropped_rows_deleted: number;
    storage_objects_deleted: number;
  }> => {
    const { data, error } = await withTimeout(
      supabase.functions.invoke<DeleteImagesResponse>("delete-user-images", {
        body: {},
      }),
      DELETE_IMAGES_TIMEOUT_MS,
      "Delete user images",
    );
    if (error) {
      console.error("[profileService] Failed to delete images:", error);
      throw new Error(error.message || "Failed to delete images");
    }
    if (!data?.success) {
      throw new Error(data?.error || "Failed to delete images");
    }
    return {
      gesture_rows_deleted: data.gesture_rows_deleted,
      cropped_rows_deleted: data.cropped_rows_deleted,
      storage_objects_deleted: data.storage_objects_deleted,
    };
  },

  /**
   * Permanently delete the current user's account, all images, and all storage objects.
   * Uses the delete-user-account edge function. After this call the user's session
   * is invalid — the caller must sign out immediately.
   */
  deleteAccount: async (): Promise<void> => {
    const { data, error } =
      await supabase.functions.invoke<DeleteAccountResponse>(
        "delete-user-account",
        { body: {} },
      );
    if (error) {
      console.error("[profileService] Failed to delete account:", error);
      throw new Error(error.message || "Failed to delete account");
    }
    if (!data?.success) {
      throw new Error(data?.error || "Failed to delete account");
    }
  },
};
