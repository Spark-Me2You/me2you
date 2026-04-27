import React, { useState, useRef } from "react";
import { useAuth } from "@/core/auth";
import { ClaimSection } from "@/features/claim";
import type { ClaimPayload } from "@/features/claim";
import { uploadTempDrawing } from "../utils/gallerySupabase";
import nextButton from "../../../../assets/next_button.svg";
import styles from "./ReviewScreen.module.css";

interface Props {
  imageDataUrl: string;
  word: string;
  onClaimed: () => void;
  onDiscard: () => void;
  onContinue: () => void;
}

type StageState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "ready"; payload: ClaimPayload }
  | { kind: "error"; message: string };

export const ReviewScreen: React.FC<Props> = ({
  imageDataUrl,
  word,
  onClaimed,
  onDiscard,
  onContinue,
}) => {
  const { kioskOrgId } = useAuth();
  const [stage, setStage] = useState<StageState>({ kind: "idle" });
  const hasUploadedRef = useRef(false);

  const handleClaim = async () => {
    if (hasUploadedRef.current) return;
    hasUploadedRef.current = true;

    if (!kioskOrgId) {
      setStage({ kind: "error", message: "Kiosk session is missing an org — sign in again." });
      return;
    }

    setStage({ kind: "uploading" });
    try {
      const { tempPath } = await uploadTempDrawing(imageDataUrl, kioskOrgId);
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
  };

  const showModal = stage.kind !== "idle";

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Your drawing of "{word}"</h2>
      <img src={imageDataUrl} alt={`Drawing of ${word}`} className={styles.preview} />

      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.primary}
          onClick={handleClaim}
          disabled={stage.kind === "uploading" || stage.kind === "ready"}
        >
          Claim & Send to Gallery
        </button>
        <button type="button" className={styles.secondary} onClick={onDiscard}>
          Discard
        </button>
      </div>

      {showModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Scan to Claim</h3>

            {stage.kind === "uploading" && (
              <p className={styles.modalSubtitle}>Preparing your QR code…</p>
            )}

            {stage.kind === "ready" && (
              <>
                <p className={styles.modalSubtitle}>
                  Scan with your phone to save this drawing to your gallery.
                </p>
                <ClaimSection payload={stage.payload} onClaimed={onClaimed} />
              </>
            )}

            {stage.kind === "error" && (
              <p className={styles.modalSubtitle}>{stage.message}</p>
            )}

            <button
              type="button"
              className={styles.nextArrow}
              aria-label="Continue"
              onClick={onContinue}
            >
              <img src={nextButton} alt="" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
