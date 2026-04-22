import React, { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { useAuth } from "@/core/auth";
import { claimService } from "@/core/supabase/claimService";
import { stageDrawingForClaim } from "../utils/gallerySupabase";
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
  | { kind: "staging" }
  | { kind: "ready"; claimUrl: string; tokenId: string; expiresAt: string }
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
  const hasStagedRef = useRef(false);

  // Subscribe to the token so we know when the user completes the claim on
  // their phone — the kiosk can then auto-advance to the thanks screen.
  useEffect(() => {
    if (stage.kind !== "ready") return;
    const unsubscribe = claimService.subscribeToClaim(stage.tokenId, () => {
      onClaimed();
    });
    return unsubscribe;
  }, [stage, onClaimed]);

  const handleClaim = async () => {
    if (hasStagedRef.current) return;
    hasStagedRef.current = true;

    if (!kioskOrgId) {
      setStage({ kind: "error", message: "Kiosk session is missing an org — sign in again." });
      return;
    }

    setStage({ kind: "staging" });
    try {
      const { claim_url, token_id, expires_at } = await stageDrawingForClaim(
        imageDataUrl,
        kioskOrgId,
        word,
      );
      setStage({ kind: "ready", claimUrl: claim_url, tokenId: token_id, expiresAt: expires_at });
    } catch (err) {
      hasStagedRef.current = false;
      const message = err instanceof Error ? err.message : "Failed to generate claim QR";
      console.error("[drawit:review] staging failed:", err);
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
          disabled={stage.kind === "staging" || stage.kind === "ready"}
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

            {stage.kind === "staging" && (
              <p className={styles.modalSubtitle}>Preparing your QR code…</p>
            )}

            {stage.kind === "ready" && (
              <>
                <p className={styles.modalSubtitle}>
                  Scan with your phone to save this drawing to your gallery.
                </p>
                <div className={styles.qrWrap}>
                  <QRCode value={stage.claimUrl} size={220} />
                </div>
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
