/**
 * Photo booth: a big mirrored live view, three numbered steps, a 3-2-1
 * countdown (so the hand that pinched the button can drop), then one frame is
 * captured and cut down to clothes on this device.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSharedCamera } from "@/core/cv/SharedCameraProvider";
import { LoadingDots } from "@/shared/components";
import { useKioskActivity } from "@/features/kiosk";
import { CLOTHESLINE_CONFIG } from "../config/clotheslineConfig";
import { captureFrame, segmentClothes, warmUpClothesSegmenter } from "../cv/clothesSegmenter";
import type { RejectReason } from "../cv/garmentMask";
import type { CapturedGarment } from "../types";
import { NOTE, NOTE_TAPE, PILL, PILL_SMALL, STEP_BADGE, STEP_TEXT, SUBTITLE, TITLE, WELL } from "./styles";

type Phase =
  | { kind: "ready" }
  | { kind: "countdown"; left: number }
  | { kind: "processing" }
  | { kind: "failed"; message: string };

const FAILURE_COPY: Record<RejectReason, string> = {
  "no-chin-line": "we couldn't see you properly. face the screen and step back a little!",
  "no-clothes": "we couldn't find your outfit. step back so your whole outfit is in the frame!",
};

const STEPS = [
  "step back until your outfit fits in the frame",
  "pinch “take my photo”",
  "drop your arms and hold still for 3, 2, 1!",
];

interface PhotoBoothProps {
  onCaptured: (garments: CapturedGarment[]) => void;
  onCancel: () => void;
}

export function PhotoBooth({ onCaptured, onCancel }: PhotoBoothProps) {
  const { stream, error: cameraError } = useSharedCamera();
  const { markActivity } = useKioskActivity();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "ready" });
  const [flashKey, setFlashKey] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    warmUpClothesSegmenter();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {
      // Muted inline autoplay is allowed; ignore the rare interrupted-play rejection.
    });
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    setFlashKey((key) => key + 1);
    setPhase({ kind: "processing" });
    try {
      const frame = captureFrame(video);
      const { garments, reason } = await segmentClothes(frame);
      if (!mountedRef.current) {
        garments.forEach((garment) => URL.revokeObjectURL(garment.previewUrl));
        return;
      }
      markActivity();
      if (garments.length) onCaptured(garments);
      else setPhase({ kind: "failed", message: FAILURE_COPY[reason ?? "no-clothes"] });
    } catch (error) {
      console.error("[clothesline] capture failed:", error);
      if (mountedRef.current) {
        setPhase({ kind: "failed", message: "something went wrong cutting out your clothes. try again!" });
      }
    }
  }, [markActivity, onCaptured]);

  // Countdown: one tick a second, then capture.
  useEffect(() => {
    if (phase.kind !== "countdown") return;
    const timer = window.setTimeout(() => {
      // Standing still for the photo shouldn't trip the return-home timer.
      markActivity();
      if (phase.left <= 1) void capture();
      else setPhase({ kind: "countdown", left: phase.left - 1 });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [phase, capture, markActivity]);

  const startCountdown = () =>
    setPhase({ kind: "countdown", left: CLOTHESLINE_CONFIG.countdownSeconds });

  const busy = phase.kind === "countdown" || phase.kind === "processing";

  return (
    <div className="absolute inset-0 flex flex-col items-center pt-8">
      <h1 className={TITLE}>photo booth</h1>
      <p className={`${SUBTITLE} mt-3`}>show us what you're wearing today!</p>

      <div className="mt-8 flex items-start gap-14">
        {/* Live view */}
        <div className={`${WELL} relative h-[660px] w-[880px]`}>
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="live camera view"
              className="block size-full -scale-x-100 bg-ink object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center px-10 text-center font-averia text-body-xl tracking-brand text-ink lowercase">
              {cameraError ? "the camera isn't available right now" : "waking up the camera"}
            </div>
          )}

          {/* Framing guide */}
          {phase.kind === "ready" && stream && (
            <div
              className="pointer-events-none absolute inset-x-[24%] inset-y-[6%] rounded-glass border-[5px] border-dashed border-white/80"
              aria-hidden="true"
            />
          )}

          {phase.kind === "countdown" && (
            <div
              key={phase.left}
              className="pointer-events-none absolute inset-0 flex animate-pop-in items-center justify-center font-jersey text-[320px] leading-none text-white [text-shadow:0_6px_0_var(--color-scrim)]"
              aria-live="assertive"
            >
              {phase.left}
            </div>
          )}

          {flashKey > 0 && (
            <div
              key={flashKey}
              className="pointer-events-none absolute inset-0 animate-shutter-flash bg-white"
              aria-hidden="true"
            />
          )}

          {phase.kind === "processing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-scrim font-jersey text-display-lg tracking-brand text-white lowercase">
              <span>cutting out your clothes</span>
              <LoadingDots />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="flex w-[520px] flex-col items-center gap-8 pt-4">
          <div className={`${NOTE} flex w-full rotate-[1.5deg] flex-col gap-5 px-7 pt-9 pb-7`}>
            <div className={NOTE_TAPE} aria-hidden="true" />
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-start gap-4">
                <span className={STEP_BADGE}>{index + 1}</span>
                <p className={STEP_TEXT}>{step}</p>
              </div>
            ))}
          </div>

          <p className="m-0 rounded-tag bg-white/70 px-5 py-3 text-center font-averia text-body-md leading-[1.35] tracking-[1px] text-ink lowercase">
            only your clothes are kept. your face, hair and skin are cut out on this
            screen, and the photo itself is never saved.
          </p>

          {phase.kind === "failed" && (
            <p
              role="alert"
              className="m-0 text-center font-averia text-body-lg leading-[1.25] font-bold tracking-[1px] text-error lowercase"
            >
              {phase.message}
            </p>
          )}

          <button
            type="button"
            className={`${PILL} w-full bg-action-clothesline`}
            onClick={startCountdown}
            disabled={busy || !stream}
          >
            {phase.kind === "failed" ? "try again" : "take my photo"}
          </button>
          <button type="button" className={`${PILL_SMALL} bg-ink-muted`} onClick={onCancel} disabled={busy}>
            back to the line
          </button>
        </div>
      </div>
    </div>
  );
}
