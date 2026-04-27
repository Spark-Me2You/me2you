import { supabase } from "@/core/supabase/client";
import { GALLERY_BUCKET, GALLERY_TABLE } from "../config/drawitConfig";
import { todayKey } from "./seededRandom";
import type { DrawingSubmission } from "../types/drawit";

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:([^;]+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

export async function uploadDrawing(dataUrl: string, word: string): Promise<DrawingSubmission> {
  const id = crypto.randomUUID();
  const dateKey = todayKey();
  const path = `${dateKey}/${id}.png`;
  const blob = dataUrlToBlob(dataUrl);

  const { error: upErr } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(path, blob, { contentType: "image/png", upsert: false });
  if (upErr) throw new Error(`Gallery upload failed: ${upErr.message}`);

  const { error: dbErr } = await supabase
    .from(GALLERY_TABLE)
    .insert({ id, word, image_path: path });
  if (dbErr) throw new Error(`Gallery DB insert failed: ${dbErr.message}`);

  const { data: signed } = await supabase.storage
    .from(GALLERY_BUCKET)
    .createSignedUrl(path, 3600);

  return {
    id,
    word,
    imageUrl: signed?.signedUrl ?? "",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Upload a drawing PNG to the private `temp-drawings` bucket under the kiosk's
 * org folder. Returns the storage path; the caller uses it to build a ClaimPayload
 * for useClaimQR. The file is moved to `drawings` by the claim-drawing edge
 * function when the user completes the claim on their phone.
 */
export async function uploadTempDrawing(
  dataUrl: string,
  orgId: string,
): Promise<{ tempPath: string }> {
  const blob = dataUrlToBlob(dataUrl);
  const drawingId = crypto.randomUUID();
  const tempPath = `${orgId}/${drawingId}.png`;

  const { error: upErr } = await supabase.storage
    .from("temp-drawings")
    .upload(tempPath, blob, { contentType: "image/png", upsert: false });
  if (upErr) throw new Error(`Temp drawing upload failed: ${upErr.message}`);

  return { tempPath };
}

export async function fetchTodaysDrawings(): Promise<DrawingSubmission[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from(GALLERY_TABLE)
    .select("id, word, image_path, created_at")
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[drawit] fetchTodaysDrawings failed:", error);
    return [];
  }
  if (!data) return [];

  const signed = await Promise.all(
    data.map(async (row) => {
      const { data: s } = await supabase.storage
        .from(GALLERY_BUCKET)
        .createSignedUrl(row.image_path as string, 3600);
      return {
        id: row.id as string,
        word: row.word as string,
        imageUrl: s?.signedUrl ?? "",
        createdAt: row.created_at as string,
      };
    }),
  );
  return signed.filter((s) => s.imageUrl);
}
