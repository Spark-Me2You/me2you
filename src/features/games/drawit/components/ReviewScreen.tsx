import React, { useState, useRef } from "react";
import { useAuth } from "@/core/auth";
import { ClaimSection } from "@/features/claim";
import type { ClaimPayload } from "@/features/claim";
import { uploadTempDrawing } from "../utils/gallerySupabase";
import nextButton from "../../../../assets/next_button.svg";
import { PinnedRegistrationQR } from "@/features/kiosk/components/PinnedRegistrationQR";
import { BTN_MD, BTN_PRIMARY, BTN_SECONDARY } from "../../components/gameUi";

const MODAL_TEXT = "m-0 max-w-[360px] text-center font-averia text-[22px] leading-[1.2] text-white";

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
    <div className="flex max-h-screen flex-col items-center gap-6 overflow-y-auto p-10">
      <h2 className="m-0 font-jersey text-[48px] tracking-brand text-white">your drawing of "{word}"</h2>
      <img src={imageDataUrl} alt={`Drawing of ${word}`} className="max-h-[60vh] max-w-[60vw] rounded-tag border-4 border-solid border-white bg-white shadow-drop" />

      <div className="flex flex-wrap justify-center gap-5">
        <button
          type="button"
          className={`${BTN_MD} ${BTN_PRIMARY}`}
          onClick={handleClaim}
          disabled={stage.kind === "uploading" || stage.kind === "ready"}
        >
          claim & send to gallery
        </button>
        <button type="button" className={`${BTN_MD} ${BTN_SECONDARY}`} onClick={onDiscard}>
          discard
        </button>
      </div>

      <PinnedRegistrationQR side="right" top={145} qrSize={150} />

      {showModal && (
        <div className="animate-fade-in-fast fixed inset-0 z-[11000] flex items-center justify-center bg-scrim backdrop-blur-[3px]">
          <div className="animate-pop-in relative flex max-w-[680px] min-w-[500px] flex-col items-center gap-[18px] rounded-glass border-[3px] border-solid border-lime bg-action-games/90 px-[72px] pt-12 pb-[110px] font-jersey shadow-glass-card">
            <h3 className="m-0 text-center text-display-md tracking-brand text-lime">scan to claim</h3>

            {stage.kind === "uploading" && (
              <p className={MODAL_TEXT}>preparing your qr code…</p>
            )}

            {stage.kind === "ready" && (
              <>
                <p className={MODAL_TEXT}>
                  scan with your phone to save this drawing to your gallery!
                </p>
                <ClaimSection payload={stage.payload} onClaimed={onClaimed} />
              </>
            )}

            {stage.kind === "error" && (
              <p className={MODAL_TEXT}>{stage.message}</p>
            )}

            <button
              type="button"
              className="absolute right-[18px] bottom-[18px] flex size-24 cursor-pointer items-center justify-center border-0 bg-transparent p-0 [transition:transform_120ms_ease] hover:[transform:translateY(-2px)_scale(1.03)] active:[transform:translateY(1px)_scale(0.98)]"
              aria-label="Continue"
              onClick={onContinue}
            >
              <img src={nextButton} alt="" className="pointer-events-none block size-full" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
