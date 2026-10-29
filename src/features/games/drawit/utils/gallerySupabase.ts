import { supabase } from "@/core/supabase/client";

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mimeMatch = meta.match(/data:([^;]+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
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
