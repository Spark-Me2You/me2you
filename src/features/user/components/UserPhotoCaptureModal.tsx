import React, { useEffect, useState } from "react";
import { usePhotoCapture } from "@/features/profile-editor/hooks/usePhotoCapture";
import type { GestureCategory } from "@/features/profile-editor/types/profileTypes";

const ACTION_BTN =
  'flex-1 cursor-pointer rounded-[14px] font-jersey lowercase [transition:background_0.2s,transform_0.1s] active:enabled:[transform:scale(0.98)]';

interface UserPhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photo: Blob, category: GestureCategory) => Promise<void>;
  isSubmitting: boolean;
}

export const UserPhotoCaptureModal: React.FC<UserPhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  isSubmitting,
}) => {
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    videoRef,
    canvasRef,
    photo,
    previewUrl,
    detectedCategory,
    detectedGestureName,
    isCameraReady,
    isGestureReady,
    cameraError,
    capturePhoto,
    retakePhoto,
    startCamera,
    stopCamera,
  } = usePhotoCapture();

  useEffect(() => {
    if (isOpen) {
      setLocalError(null);
      void startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const handleSave = async () => {
    if (!photo || !detectedCategory) return;

    setLocalError(null);
    try {
      await onCapture(photo, detectedCategory);
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "failed to save photo",
      );
    }
  };

  if (!isOpen) return null;

  const gestureLabel = detectedGestureName
    ? `✓ ${detectedGestureName.replace(/_/g, " ")}`
    : "detecting...";

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-[rgba(0,0,0,0.85)]" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[24px] bg-[linear-gradient(to_bottom,#58e7f7_0%,#fefffb_100%)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-3">
          <h2 className="m-0 font-jersey text-[28px] tracking-[2px] text-[#e44805] lowercase">update photo</h2>
          <button
            onClick={onClose}
            className="h-9 w-9 cursor-pointer border-0 bg-transparent p-0 font-jersey text-[28px] leading-none text-[#555] disabled:opacity-40"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-8">
          {!photo && (
            <div className="text-center">
              <p className="m-0 mb-[10px] font-jersey text-[18px] leading-[1.4] text-[#444] lowercase">
                show a gesture, then capture!
              </p>
              <div className="flex justify-center gap-6 text-[32px]">
                <span>👋</span>
                <span>✌️</span>
                <span>👍</span>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="rounded-[10px] bg-[rgba(211,47,47,0.1)] px-[14px] py-[10px] text-center font-jersey text-[16px] text-[#d32f2f]">{cameraError}</div>
          )}

          {localError && <div className="rounded-[10px] bg-[rgba(211,47,47,0.1)] px-[14px] py-[10px] text-center font-jersey text-[16px] text-[#d32f2f]">{localError}</div>}

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px] border-4 border-solid border-[#e44805] bg-black">
            {previewUrl && (
              <img src={previewUrl} alt="captured" className="h-full w-full object-cover" />
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full -scale-x-100 object-cover"
              style={{ display: previewUrl ? "none" : undefined }}
            />

            {!previewUrl && !isCameraReady && !cameraError && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[10px] bg-[rgba(0,0,0,0.6)] px-5 py-3 text-center font-jersey text-[20px] text-white lowercase">starting camera...</div>
            )}

            {!previewUrl && isCameraReady && !isGestureReady && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[10px] bg-[rgba(0,0,0,0.6)] px-5 py-3 text-center font-jersey text-[20px] text-white lowercase">
                loading gesture detection...
              </div>
            )}

            {isCameraReady && isGestureReady && (
              <div
                className={`absolute right-3 bottom-3 rounded-[8px] px-3 py-[6px] font-jersey text-[16px] text-white ${detectedGestureName ? "bg-[rgba(34,139,34,0.75)]" : "bg-[rgba(0,0,0,0.6)]"}`}
              >
                {gestureLabel}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />

          <div className="flex gap-[10px]">
            {!photo ? (
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!isCameraReady || !isGestureReady || isSubmitting}
                className={`${ACTION_BTN} border-0 bg-[#e44805] p-[14px] text-[24px] tracking-[2px] text-white hover:enabled:bg-[#cc4004] disabled:cursor-not-allowed disabled:opacity-50`}
              >
                capture
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={retakePhoto}
                  disabled={isSubmitting}
                  className={`${ACTION_BTN} border-2 border-solid border-[rgba(0,0,0,0.15)] bg-[rgba(255,255,255,0.7)] p-3 text-[22px] tracking-[1px] text-[#666] hover:enabled:bg-[rgba(255,255,255,0.9)] disabled:opacity-40`}
                >
                  retake
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!detectedCategory || isSubmitting}
                  className={`${ACTION_BTN} border-0 bg-[#e44805] p-[14px] text-[24px] tracking-[2px] text-white hover:enabled:bg-[#cc4004] disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isSubmitting ? "saving..." : "looks good!"}
                </button>
              </>
            )}
          </div>

          {photo && !detectedCategory && (
            <p className="m-0 text-center font-jersey text-[16px] text-[#d32f2f]">
              no gesture detected — retake with a wave, peace sign, or thumbs up
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
