import React, { useEffect, useState } from "react";
import { usePhotoCapture } from "@/features/profile-editor/hooks/usePhotoCapture";
import type { GestureCategory } from "@/features/profile-editor/types/profileTypes";
import styles from "./UserPhotoCaptureModal.module.css";

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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>update photo</h2>
          <button
            onClick={onClose}
            className={styles.closeBtn}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          {!photo && (
            <div className={styles.instructions}>
              <p className={styles.instructionText}>
                show a gesture, then capture!
              </p>
              <div className={styles.gestureIcons}>
                <span>👋</span>
                <span>✌️</span>
                <span>👍</span>
              </div>
            </div>
          )}

          {cameraError && (
            <div className={styles.errorBanner}>{cameraError}</div>
          )}

          {localError && <div className={styles.errorBanner}>{localError}</div>}

          <div className={styles.cameraContainer}>
            {previewUrl && (
              <img src={previewUrl} alt="captured" className={styles.preview} />
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={styles.video}
              style={{ display: previewUrl ? "none" : undefined }}
            />

            {!previewUrl && !isCameraReady && !cameraError && (
              <div className={styles.loadingOverlay}>starting camera...</div>
            )}

            {!previewUrl && isCameraReady && !isGestureReady && (
              <div className={styles.loadingOverlay}>
                loading gesture detection...
              </div>
            )}

            {isCameraReady && isGestureReady && (
              <div
                className={`${styles.gestureStatus} ${detectedGestureName ? styles.gestureDetected : ""}`}
              >
                {gestureLabel}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: "none" }} />

          <div className={styles.actions}>
            {!photo ? (
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!isCameraReady || !isGestureReady || isSubmitting}
                className={styles.captureBtn}
              >
                capture
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={retakePhoto}
                  disabled={isSubmitting}
                  className={styles.retakeBtn}
                >
                  retake
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!detectedCategory || isSubmitting}
                  className={styles.saveBtn}
                >
                  {isSubmitting ? "saving..." : "looks good!"}
                </button>
              </>
            )}
          </div>

          {photo && !detectedCategory && (
            <p className={styles.warningText}>
              no gesture detected — retake with a wave, peace sign, or thumbs up
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
