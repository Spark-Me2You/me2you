/**
 * Supabase garment store
 * Needs migration 034 (`garments` table, `garments` bucket,
 * `accessories.equipped_garment_id`) and the `claim-garment` edge function.
 */

import { supabase } from "@/core/supabase/client";
import type { CapturedGarment, Garment, GarmentKind, GarmentWithUrl } from "../types";
import { lineChanges, type GarmentStore } from "./garmentStore";

const BUCKET = "garments";
const SIGNED_URL_SECONDS = 3600;
const COLUMNS = "id, org_id, owner_id, kind, image_path, width, height, created_at";

interface GarmentRow {
  id: string;
  org_id: string;
  owner_id: string | null;
  kind: GarmentKind;
  image_path: string;
  width: number;
  height: number;
  created_at: string;
}

const toGarment = (row: GarmentRow): Garment => ({
  id: row.id,
  orgId: row.org_id,
  ownerId: row.owner_id,
  kind: row.kind,
  imagePath: row.image_path,
  width: row.width,
  height: row.height,
  createdAt: row.created_at,
});

/** Attach signed URLs; garments whose file can't be signed are dropped. */
async function withUrls(rows: GarmentRow[]): Promise<GarmentWithUrl[]> {
  if (!rows.length) return [];
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(rows.map((row) => row.image_path), SIGNED_URL_SECONDS);
  if (error || !data) {
    console.error("[clothesline] signing garment URLs failed:", error?.message);
    return [];
  }
  const urlByPath = new Map<string, string>();
  for (const entry of data) {
    if (entry.path && entry.signedUrl) urlByPath.set(entry.path, entry.signedUrl);
  }
  return rows.flatMap((row) => {
    const url = urlByPath.get(row.image_path);
    return url ? [{ ...toGarment(row), url }] : [];
  });
}

export const supabaseGarmentStore: GarmentStore = {

  async listLine(orgId, limit) {
    // Unclaimed garments come down when they expire; claimed ones stay up.
    const { data, error } = await supabase
      .from("garments")
      .select(COLUMNS)
      .eq("org_id", orgId)
      .or(`owner_id.not.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[clothesline] list failed:", error.message);
      return [];
    }
    return withUrls((data ?? []) as GarmentRow[]);
  },

  async hang(orgId, pieces: CapturedGarment[]) {
    const hung: Garment[] = [];
    let lastError: string | null = null;

    for (const piece of pieces) {
      const id = crypto.randomUUID();
      const path = `${orgId}/${id}.png`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, piece.blob, { contentType: "image/png", upsert: false });
      if (uploadError) {
        lastError = uploadError.message;
        continue;
      }
      const { data, error } = await supabase
        .from("garments")
        .insert({
          id,
          org_id: orgId,
          kind: piece.kind,
          image_path: path,
          width: piece.width,
          height: piece.height,
        })
        .select(COLUMNS)
        .single();
      if (error || !data) {
        // The kiosk can't delete from the bucket; the orphaned file has no row
        // pointing at it, so nothing can list or sign it.
        lastError = error?.message ?? "insert returned no row";
        continue;
      }
      hung.push(toGarment(data as GarmentRow));
    }

    if (!hung.length) throw new Error(`Could not hang the clothes: ${lastError ?? "unknown error"}`);
    lineChanges.notify();
    return hung;
  },

  async listMine(userId) {
    const { data, error } = await supabase
      .from("garments")
      .select(COLUMNS)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[clothesline] listMine failed:", error.message);
      return [];
    }
    return withUrls((data ?? []) as GarmentRow[]);
  },

  async remove(garment) {
    // File first: the storage policy checks ownership through the row.
    const { error: fileError } = await supabase.storage.from(BUCKET).remove([garment.imagePath]);
    if (fileError) throw new Error(`Could not delete the garment image: ${fileError.message}`);
    const { error } = await supabase.from("garments").delete().eq("id", garment.id);
    if (error) throw new Error(`Could not delete the garment: ${error.message}`);
    lineChanges.notify();
  },

  async getEquipped(userIds) {
    if (!userIds.length) return {};
    const { data: equipped, error } = await supabase
      .from("accessories")
      .select("user_id, equipped_garment_id")
      .in("user_id", userIds)
      .not("equipped_garment_id", "is", null);
    if (error) {
      console.error("[clothesline] getEquipped failed:", error.message);
      return {};
    }
    const rows = (equipped ?? []) as { user_id: string; equipped_garment_id: string }[];
    if (!rows.length) return {};

    const { data: garments, error: garmentError } = await supabase
      .from("garments")
      .select(COLUMNS)
      .in("id", rows.map((row) => row.equipped_garment_id));
    if (garmentError) {
      console.error("[clothesline] equipped garments failed:", garmentError.message);
      return {};
    }
    const byId = new Map((await withUrls((garments ?? []) as GarmentRow[])).map((g) => [g.id, g]));

    const result: Record<string, GarmentWithUrl> = {};
    for (const row of rows) {
      const garment = byId.get(row.equipped_garment_id);
      // Only ever dress a mii in a top its own user owns.
      if (garment && garment.ownerId === row.user_id && garment.kind === "top") {
        result[row.user_id] = garment;
      }
    }
    return result;
  },

  async setEquipped(userId, orgId, garmentId) {
    const { error } = await supabase
      .from("accessories")
      .upsert(
        { user_id: userId, org_id: orgId, equipped_garment_id: garmentId },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(`Could not update your outfit: ${error.message}`);
  },

  subscribe: lineChanges.subscribe,
};
