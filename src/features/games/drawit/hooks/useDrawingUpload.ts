import { useCallback, useRef, useState } from "react";
import type { ClaimPayload } from "@/features/claim";
import { uploadTempDrawing } from "../utils/gallerySupabase";

export type UploadStage =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "ready"; payload: ClaimPayload }
  | { kind: "error"; message: string };

interface Options {
  imageDataUrl: string;
  word: string;
  orgId: string | null;
}

/** The drawing is only safely staged for claiming once the upload succeeded. */
export const canContinue = (stage: UploadStage): boolean => stage.kind === "ready";

/**
 * Uploads the drawing to temp storage and builds its claim payload.
 * `start` is a no-op while an upload is running or done, and is also the retry
 * after an error; `dismiss` returns an errored attempt to idle.
 */
export function useDrawingUpload({ imageDataUrl, word, orgId }: Options) {
  const [stage, setStage] = useState<UploadStage>({ kind: "idle" });
  const hasUploadedRef = useRef(false);

  const start = useCallback(async () => {
    if (hasUploadedRef.current) return;
    hasUploadedRef.current = true;

    if (!orgId) {
      hasUploadedRef.current = false;
      setStage({ kind: "error", message: "Kiosk session is missing an org — sign in again." });
      return;
    }

    setStage({ kind: "uploading" });
    try {
      const { tempPath } = await uploadTempDrawing(imageDataUrl, orgId);
      const payload: ClaimPayload = {
        version: "1.0",
        type: "drawing",
        display: { title: "Claim your drawing", description: word },
        data: { image_path: tempPath, prompt: word },
      };
      setStage({ kind: "ready", payload });
    } catch (err) {
      hasUploadedRef.current = false;
      const message = err instanceof Error ? err.message : "Failed to upload drawing";
      console.error("[drawit:review] upload failed:", err);
      setStage({ kind: "error", message });
    }
  }, [imageDataUrl, word, orgId]);

  const dismiss = useCallback(() => {
    setStage((s) => (s.kind === "error" ? { kind: "idle" } : s));
  }, []);

  return { stage, start, dismiss };
}
