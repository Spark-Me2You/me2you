/**
 * Delete User Images Edge Function
 *
 * Deletes all gesture_image and cropped_image records (and their storage objects)
 * for the calling user. The user's account, profile, and profile photo (image table)
 * remain intact. Intended as a "clear my photos / start fresh" operation.
 *
 * SECURITY:
 * - User ID is extracted from JWT only — never from request body.
 * - org_id is derived from public.user row under the caller's JWT (RLS enforced).
 * - Service role client is only created after JWT verification + ownership check.
 * - Storage paths are DB-sourced, not client-supplied.
 *
 * CASCADE NOTE:
 * Migration 013_add_cascade_deletes.sql sets ON DELETE CASCADE from auth.users
 * to gesture_image and cropped_image. This function explicitly deletes those rows
 * and their storage objects while leaving auth.users / public.user / public.image intact.
 *
 * Environment variables (auto-provided by Supabase):
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const hasUnsafePathSegments = (path: string): boolean => {
  const segments = path.split("/");
  return segments.some((segment) => segment === "." || segment === "..");
};

const isOwnedStoragePath = (
  path: string,
  orgId: string,
  userId: string,
): boolean => {
  const normalizedPath = path.replace(/^\/+/, "").trim();
  const requiredPrefix = `${orgId}/${userId}/`;

  if (!normalizedPath.startsWith(requiredPrefix)) {
    return false;
  }

  return !hasUnsafePathSegments(normalizedPath);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[delete-user-images] Function invoked");

    // 1. JWT gate: verify caller identity via anon+JWT client
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing authorization header",
          error_code: "MISSING_AUTH",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseJWT = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
            apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          },
        },
      },
    );

    const { data: authResult, error: authError } =
      await supabaseJWT.auth.getUser();
    if (authError || !authResult?.user) {
      console.error(
        "[delete-user-images] JWT verification failed:",
        authError?.message,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired token",
          error_code: "INVALID_TOKEN",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userId = authResult.user.id;
    console.log("[delete-user-images] Verified caller user_id:", userId);

    // 2. Ownership check: fetch user row via caller's JWT so RLS enforces self-access
    const { data: userRow, error: userError } = await supabaseJWT
      .from("user")
      .select("id, org_id")
      .eq("id", userId)
      .maybeSingle();

    if (userError || !userRow) {
      console.error(
        "[delete-user-images] User row not found:",
        userError?.message,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "User profile not found",
          error_code: "USER_NOT_FOUND",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!userRow.org_id) {
      console.error("[delete-user-images] User has no org_id:", userId);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not determine organization",
          error_code: "ORG_NOT_RESOLVED",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const orgId = userRow.org_id;
    console.log("[delete-user-images] org_id resolved:", orgId);

    // 3. Handoff to service role for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 4. Collect storage paths from gesture_image and cropped_image
    const [gestureResult, croppedResult] = await Promise.all([
      supabaseAdmin
        .from("gesture_image")
        .select("id, storage_path")
        .eq("owner_id", userId),
      supabaseAdmin
        .from("cropped_image")
        .select("id, storage_path")
        .eq("owner_id", userId),
    ]);

    if (gestureResult.error) {
      console.error(
        "[delete-user-images] Failed to query gesture_image:",
        gestureResult.error.message,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to query image records",
          error_code: "DB_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (croppedResult.error) {
      console.error(
        "[delete-user-images] Failed to query cropped_image:",
        croppedResult.error.message,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to query image records",
          error_code: "DB_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const gesturePaths = (gestureResult.data ?? [])
      .map((r) => r.storage_path)
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );
    const croppedPaths = (croppedResult.data ?? [])
      .map((r) => r.storage_path)
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );
    // Dedupe in case any path appears in both tables
    const allStoragePaths = [...new Set([...gesturePaths, ...croppedPaths])];
    const validStoragePaths = allStoragePaths.filter((path) =>
      isOwnedStoragePath(path, orgId, userId),
    );
    const rejectedStoragePaths = allStoragePaths.filter(
      (path) => !isOwnedStoragePath(path, orgId, userId),
    );

    console.log(
      `[delete-user-images] Paths collected: gesture=${gesturePaths.length} cropped=${croppedPaths.length} unique=${allStoragePaths.length} valid=${validStoragePaths.length} rejected=${rejectedStoragePaths.length}`,
    );

    if (rejectedStoragePaths.length > 0) {
      console.warn(
        `[delete-user-images] Skipping ${rejectedStoragePaths.length} path(s) outside owned prefix for user=${userId} org=${orgId}`,
      );
    }

    // 5. Remove from storage (only the paths owned by gesture/cropped tables)
    let storageDeletedCount = 0;
    if (validStoragePaths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("images")
        .remove(validStoragePaths);
      if (storageError) {
        console.error(
          "[delete-user-images] Storage removal failed:",
          storageError.message,
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to delete image files",
            error_code: "STORAGE_ERROR",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      storageDeletedCount = validStoragePaths.length;
    }

    // 6. Delete DB rows
    const [gestureDeleteResult, croppedDeleteResult] = await Promise.all([
      supabaseAdmin.from("gesture_image").delete().eq("owner_id", userId),
      supabaseAdmin.from("cropped_image").delete().eq("owner_id", userId),
    ]);

    if (gestureDeleteResult.error) {
      console.error(
        "[delete-user-images] Failed to delete gesture_image rows:",
        gestureDeleteResult.error.message,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to delete image records",
          error_code: "DB_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (croppedDeleteResult.error) {
      console.error(
        "[delete-user-images] Failed to delete cropped_image rows:",
        croppedDeleteResult.error.message,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to delete image records",
          error_code: "DB_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const gestureRowsDeleted = gestureResult.data?.length ?? 0;
    const croppedRowsDeleted = croppedResult.data?.length ?? 0;

    console.log(
      `[delete-user-images] Complete: user=${userId} org=${orgId} storage=${storageDeletedCount} gesture_rows=${gestureRowsDeleted} cropped_rows=${croppedRowsDeleted}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        gesture_rows_deleted: gestureRowsDeleted,
        cropped_rows_deleted: croppedRowsDeleted,
        storage_objects_deleted: storageDeletedCount,
        storage_paths_rejected: rejectedStoragePaths.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[delete-user-images] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        error_code: "SERVER_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
