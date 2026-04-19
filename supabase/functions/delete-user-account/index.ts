/**
 * Delete User Account Edge Function
 *
 * Permanently deletes the calling user's account. Steps:
 * 1. Verifies the caller's JWT and resolves their org_id from the database (RLS enforced).
 * 2. Removes all storage objects under images/{org_id}/{user_id}/ in the images bucket.
 * 3. Calls auth.admin.deleteUser() — which cascades to public.user, public.admin,
 *    public.image, public.gesture_image, and public.cropped_image via the FK ON DELETE
 *    CASCADE constraints established in migration 013_add_cascade_deletes.sql.
 *
 * ORDERING: Storage is deleted BEFORE the auth user is removed. If auth deletion fails,
 * the account remains and the user can retry. The reverse ordering would leave orphaned
 * storage objects with no identifiable owner for cleanup.
 *
 * SECURITY:
 * - User ID is extracted from JWT only — never accepted from request body.
 * - org_id is derived from public.user under the caller's own JWT (RLS enforced);
 *   a caller cannot forge another user's org_id.
 * - Service role client is only instantiated after JWT verification + ownership check.
 * - A caller can only delete their own account. Admin-initiated deletion of other users
 *   is intentionally out of scope for this function.
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

type StorageListEntry = {
  name: string;
  id: string | null;
  metadata?: Record<string, unknown> | null;
};

const STORAGE_LIST_PAGE_SIZE = 1000;
const STORAGE_REMOVE_BATCH_SIZE = 100;

const listAllStorageFiles = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  bucket: string,
  rootPrefix: string,
): Promise<string[]> => {
  const prefixesToVisit: string[] = [rootPrefix];
  const visitedPrefixes = new Set<string>();
  const filePaths = new Set<string>();

  while (prefixesToVisit.length > 0) {
    const currentPrefix = prefixesToVisit.shift();
    if (!currentPrefix || visitedPrefixes.has(currentPrefix)) {
      continue;
    }

    visitedPrefixes.add(currentPrefix);
    let offset = 0;

    while (true) {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .list(currentPrefix, {
          limit: STORAGE_LIST_PAGE_SIZE,
          offset,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) {
        throw new Error(
          `Failed to list storage objects at ${currentPrefix}: ${error.message}`,
        );
      }

      const entries = (data ?? []) as StorageListEntry[];
      for (const entry of entries) {
        if (!entry?.name) {
          continue;
        }

        const fullPath = `${currentPrefix}/${entry.name}`;
        const isDirectory = entry.id === null || entry.metadata === null;

        if (isDirectory) {
          if (!visitedPrefixes.has(fullPath)) {
            prefixesToVisit.push(fullPath);
          }
          continue;
        }

        filePaths.add(fullPath);
      }

      if (entries.length < STORAGE_LIST_PAGE_SIZE) {
        break;
      }

      offset += entries.length;
    }
  }

  return Array.from(filePaths);
};

const deleteStorageFilesInBatches = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  bucket: string,
  storagePaths: string[],
): Promise<number> => {
  let deletedCount = 0;

  for (let i = 0; i < storagePaths.length; i += STORAGE_REMOVE_BATCH_SIZE) {
    const chunk = storagePaths.slice(i, i + STORAGE_REMOVE_BATCH_SIZE);
    const { error } = await supabaseAdmin.storage.from(bucket).remove(chunk);

    if (error) {
      throw new Error(`Failed to remove storage objects: ${error.message}`);
    }

    deletedCount += chunk.length;
  }

  return deletedCount;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[delete-user-account] Function invoked");

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
        "[delete-user-account] JWT verification failed:",
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
    console.log("[delete-user-account] Verified caller user_id:", userId);

    // 2. Ownership check: fetch user row via caller's JWT so RLS enforces self-access
    const { data: userRow, error: userError } = await supabaseJWT
      .from("user")
      .select("id, org_id")
      .eq("id", userId)
      .maybeSingle();

    if (userError || !userRow) {
      console.error(
        "[delete-user-account] User row not found:",
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
      console.error("[delete-user-account] User has no org_id:", userId);
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
    console.log("[delete-user-account] org_id resolved:", orgId);

    // 3. Handoff to service role for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 4. List all storage objects under {org_id}/{user_id}/ recursively
    const storagePrefix = `${orgId}/${userId}`;
    let storagePaths: string[] = [];
    try {
      storagePaths = await listAllStorageFiles(
        supabaseAdmin,
        "images",
        storagePrefix,
      );
    } catch (error) {
      console.error(
        "[delete-user-account] Failed to list storage objects:",
        error,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to list image files",
          error_code: "STORAGE_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[delete-user-account] Found ${storagePaths.length} storage objects to remove`,
    );

    // 5. Delete all storage objects in batches (before auth user, so a retry is possible on failure)
    let storageDeletedCount = 0;
    if (storagePaths.length > 0) {
      try {
        storageDeletedCount = await deleteStorageFilesInBatches(
          supabaseAdmin,
          "images",
          storagePaths,
        );
      } catch (error) {
        console.error(
          "[delete-user-account] Failed to remove storage objects:",
          error,
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
    }

    console.log(
      `[delete-user-account] Storage cleaned: ${storageDeletedCount} objects removed`,
    );

    // 6. Delete auth user — cascades to public.user, public.admin, public.image,
    //    public.gesture_image, public.cropped_image (migration 013)
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      // Storage already deleted. The account still exists — log for admin investigation.
      console.error(
        `[delete-user-account] ORPHAN STATE: storage deleted but auth delete failed user=${userId} org=${orgId}:`,
        deleteError.message,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Account images removed but account deletion failed. Please contact support to complete removal.",
          error_code: "AUTH_DELETE_FAILED",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `[delete-user-account] Complete: user=${userId} org=${orgId} storage=${storageDeletedCount} auth_deleted=true`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        storage_objects_deleted: storageDeletedCount,
        auth_user_deleted: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[delete-user-account] Unexpected error:", error);
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
