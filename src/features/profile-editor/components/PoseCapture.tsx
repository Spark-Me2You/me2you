/**
 * PoseCapture: the "choose a pose!" camera screen shared by account creation
 * (registration PhotoStep) and updating a photo later (UserPhotoCaptureModal),
 * so both look and behave the same.
 *
 * The pose is detected live while the camera shows; after the shutter it's
 * checked for a moment ("checking your pose . . .") and always ends in either
 * a detected pose or a clear "try again", never a stuck screen.
 */

import React, { useEffect, useState } from "react";
import { LoadingDots } from "@/shared/components/LoadingDots";
import { usePhotoCapture } from "../hooks/usePhotoCapture";
import { poseLabel } from "../utils/poseVotes";
import type { GestureCategory } from "../types/profileTypes";
import pinkBackArrowImg from "@/assets/pink_back_arrow.svg";
import nextButtonImg from "@/assets/next_button.svg";
import peaceImg from "@/assets/peace.png";
import waveImg from "@/assets/wave.png";
import thumbsUpImg from "@/assets/thumbsUP.png";

const BANNER_TEXT = "m-0 font-averia text-[22px] leading-[1.4] tracking-[3.74px] text-white";
const CENTER_OVERLAY =
  "absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2 bg-ink/50 px-6 text-center font-jersey text-white lowercase";
const STATUS_PILL =
  "pointer-events-none absolute right-[10px] bottom-2 z-[3] rounded-[8px] px-3 py-1 font-jersey text-[18px] tracking-[1px] text-white lowercase";
const GUIDE =
  "absolute top-1/2 flex -translate-y-1/2 items-end justify-center border-[3px] border-dashed border-white/90 pb-[6px]";
const GUIDE_LABEL =
  "font-jersey text-[14px] tracking-[2px] text-white lowercase [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]";
const ARROW_BTN =
  "flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent px-2 py-1 text-center font-jersey text-[16px] leading-[1.2] tracking-[2.72px] text-ink disabled:cursor-not-allowed disabled:opacity-40";

interface PoseCaptureProps {
  /** Save the photo. Throwing (or rejecting) shows the message on screen. */
  onSubmit: (photo: Blob, category: GestureCategory) => Promise<unknown>;
  onBack: () => void;
  backLabel?: string;
  isSubmitting: boolean;
  /** Error from the caller (e.g. upload failed). */
  error?: string | null;
  onClearError?: () => void;
}

export const PoseCapture: React.FC<PoseCaptureProps> = ({
  onSubmit,
  onBack,
  backLabel = "go back",
  isSubmitting,
  error,
  onClearError,
}) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    videoRef,
    canvasRef,
    photo,
    previewUrl,
    phase,
    liveCategory,
    detectedCategory,
    isCameraReady,
    isGestureReady,
    gestureError,
    cameraError,
    capturePhoto,
    retakePhoto,
    startCamera,
    stopCamera,
  } = usePhotoCapture();

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const clearErrors = () => {
    setSubmitError(null);
    onClearError?.();
  };

  const handleCapture = () => {
    clearErrors();
    capturePhoto();
  };

  const handleRetake = () => {
    clearErrors();
    retakePhoto();
  };

  const handleLooksGood = async () => {
    if (!photo || !detectedCategory) return;
    clearErrors();
    try {
      await onSubmit(photo, detectedCategory);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "failed to save photo — please try again");
    }
  };

  const isLive = phase === "live";
  const displayError = submitError || error || cameraError || gestureError;
  const canCapture = isCameraReady && isGestureReady && !isSubmitting;

  return (
    <div className="relative flex min-h-dvh flex-col pt-[112px]">
      <div className="mb-3 bg-magenta px-5 py-3 text-center">
        <p className={BANNER_TEXT}>choose a pose!</p>
        <p className={BANNER_TEXT}>*do not put hands over face*</p>
      </div>

      {/* Decorative hands */}
      <div className="relative z-[5] -mb-8 h-[110px]" aria-hidden="true">
        <img src={peaceImg} alt="" className="absolute top-[-10px] left-7 w-[58px] origin-bottom rotate-[38.55deg]" />
        <img src={waveImg} alt="" className="absolute top-[25px] left-1/2 w-[80px] origin-bottom -translate-x-1/2" />
        <img src={thumbsUpImg} alt="" className="absolute top-10 right-7 w-[80px] origin-bottom" />
      </div>

      <div className="mx-[6px] box-border flex h-[420px] flex-col rounded-[46px] bg-glass px-5 pt-[44px] pb-[10px] shadow-glass-card">
        {displayError && (
          <div
            role="alert"
            className="mb-3 rounded-[10px] border border-solid border-[rgba(255,60,60,0.35)] bg-[rgba(255,60,60,0.12)] px-[14px] py-2 text-center font-averia text-[13px] tracking-[0.5px] text-[#b00]"
          >
            {displayError}
          </div>
        )}

        {/* Camera / preview area */}
        <div className="relative mb-4 w-full flex-1 overflow-hidden rounded-[8px] bg-[#d9d9d9]">
          {previewUrl && <img src={previewUrl} alt="your photo" className="h-full w-full object-cover" />}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full -scale-x-100 object-cover"
            style={{ display: previewUrl ? "none" : undefined }}
          />

          {/* Head / hand guides */}
          {isLive && isCameraReady && (
            <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
              <div className={`${GUIDE} left-[34%] aspect-[3/4] w-[44%] -translate-x-1/2 rounded-full`}>
                <span className={GUIDE_LABEL}>head</span>
              </div>
              <div className={`${GUIDE} right-[5%] h-[46%] w-[24%] rounded-[12px]`}>
                <span className={GUIDE_LABEL}>hand</span>
              </div>
            </div>
          )}

          {isLive && !isCameraReady && !cameraError && (
            <div className={`${CENTER_OVERLAY} text-[22px]`}>starting camera...</div>
          )}
          {isLive && isCameraReady && !isGestureReady && !gestureError && (
            <div className={`${CENTER_OVERLAY} text-[22px]`}>loading pose detection...</div>
          )}

          {phase === "classifying" && (
            <div className={`${CENTER_OVERLAY} text-[30px] tracking-[2px]`} role="status">
              <span>
                checking your pose <LoadingDots />
              </span>
            </div>
          )}

          {phase === "failed" && (
            <div className={`${CENTER_OVERLAY} text-[24px] leading-[1.25] tracking-[1px]`} role="alert">
              <span className="text-[30px]">we couldn't see your pose!</span>
              <span>try again with a clear ✌️ 👋 or 👍</span>
            </div>
          )}

          {/* Live pose feedback, then the captured pose */}
          {isLive && isCameraReady && isGestureReady && (
            <div className={`${STATUS_PILL} ${liveCategory ? "bg-[rgba(34,139,34,0.8)]" : "bg-ink/55"}`}>
              {liveCategory ? `✓ ${poseLabel(liveCategory)}` : "show a pose"}
            </div>
          )}
          {phase === "detected" && detectedCategory && (
            <div className={`${STATUS_PILL} bg-[rgba(34,139,34,0.8)]`}>✓ {poseLabel(detectedCategory)}</div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Bottom controls */}
        {isLive ? (
          <div className="flex justify-center pt-[10px]">
            <button
              type="button"
              className="block h-16 w-16 cursor-pointer rounded-full border-4 border-solid border-white/85 bg-white/55 shadow-[0_0_0_4px_var(--color-magenta)] transition-transform duration-100 active:enabled:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleCapture}
              disabled={!canCapture}
              aria-label="take photo"
            />
          </div>
        ) : (
          <div className="flex items-start justify-between pt-[10px]">
            <button type="button" className={ARROW_BTN} onClick={handleRetake} disabled={isSubmitting || phase === "classifying"}>
              <img src={pinkBackArrowImg} alt="" className="w-[56px] rotate-[-4.71deg]" />
              {phase === "failed" ? "try again!" : "retake please!"}
            </button>

            <button
              type="button"
              className={ARROW_BTN}
              onClick={handleLooksGood}
              disabled={isSubmitting || phase !== "detected"}
            >
              <img src={nextButtonImg} alt="" className="w-[56px] rotate-[5deg]" />
              {isSubmitting ? "saving..." : "looks good!"}
            </button>
          </div>
        )}
      </div>

      {/* Go back */}
      <button
        type="button"
        className="mt-[30px] flex cursor-pointer flex-col items-center gap-1 border-0 bg-transparent px-[18px] pt-3 pb-2 font-jersey text-[24px] tracking-[4.08px] text-ink disabled:cursor-not-allowed disabled:opacity-40"
        onClick={onBack}
        disabled={isSubmitting}
      >
        <img src={pinkBackArrowImg} alt="" className="w-[80px] rotate-[-4.71deg]" />
        {backLabel}
      </button>
    </div>
  );
};
