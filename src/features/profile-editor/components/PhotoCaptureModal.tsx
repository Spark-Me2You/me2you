import React, { useEffect } from 'react';
import { usePhotoCapture } from '../hooks/usePhotoCapture';
import type { GestureCategory } from '../types/profileTypes';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photo: Blob, category: GestureCategory) => Promise<void>;
  isSubmitting: boolean;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  isSubmitting,
}) => {
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
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const handleSave = async () => {
    if (!photo || !detectedCategory) return;
    await onCapture(photo, detectedCategory);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Update Profile Photo</h2>
          <button onClick={onClose} style={styles.closeBtn} disabled={isSubmitting}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {/* Instructions */}
          {!photo && (
            <div style={styles.instructions}>
              <p style={styles.instructionText}>Show a gesture (wave, peace sign, or thumbs up) then capture!</p>
              <div style={styles.gestureIcons}>
                <span style={styles.gestureIcon}>👋</span>
                <span style={styles.gestureIcon}>✌️</span>
                <span style={styles.gestureIcon}>👍</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {cameraError && (
            <div style={styles.errorBanner}>{cameraError}</div>
          )}

          {/* Camera / Preview Area */}
          <div style={styles.cameraContainer}>
            {previewUrl ? (
              <img src={previewUrl} alt="Captured" style={styles.preview} />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={styles.video}
              />
            )}

            {!previewUrl && !isCameraReady && !cameraError && (
              <div style={styles.loadingOverlay}>Starting camera...</div>
            )}

            {!previewUrl && isCameraReady && !isGestureReady && (
              <div style={styles.loadingOverlay}>Loading gesture detection...</div>
            )}

            {/* Gesture Status Overlay */}
            {previewUrl && (
              <div style={styles.gestureStatus}>
                {detectedGestureName
                  ? `✓ ${detectedGestureName.replace(/_/g, ' ')}`
                  : 'Detecting...'}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Action Buttons */}
          <div style={styles.actions}>
            {!photo ? (
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!isCameraReady || !isGestureReady || isSubmitting}
                style={styles.captureBtn}
              >
                Capture Photo
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={retakePhoto}
                  disabled={isSubmitting}
                  style={styles.retakeBtn}
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!detectedCategory || isSubmitting}
                  style={styles.saveBtn}
                >
                  {isSubmitting ? 'Saving...' : 'Looks Good!'}
                </button>
              </>
            )}
          </div>

          {/* Gesture Requirement Notice */}
          {photo && !detectedCategory && (
            <p style={styles.warningText}>
              No gesture detected. Please retake with a clear wave, peace sign, or thumbs up.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    background: '#ffffff',
    borderRadius: '16px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 2rem',
    borderBottom: '1px solid #e8e8e8',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111111',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    color: '#555',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0',
    width: '2rem',
    height: '2rem',
  },
  content: {
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  instructions: {
    textAlign: 'center',
  },
  instructionText: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    color: '#555',
  },
  gestureIcons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
  },
  gestureIcon: {
    fontSize: '3rem',
  },
  errorBanner: {
    padding: '0.75rem 1rem',
    background: '#fee',
    color: '#c33',
    borderRadius: '8px',
    fontSize: '0.95rem',
    textAlign: 'center',
  },
  cameraContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 3',
    background: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)', // Mirror for selfie view
  },
  preview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ffffff',
    fontSize: '1.1rem',
    fontWeight: 600,
    background: 'rgba(0, 0, 0, 0.6)',
    padding: '1rem 2rem',
    borderRadius: '8px',
  },
  gestureStatus: {
    position: 'absolute',
    bottom: '1rem',
    right: '1rem',
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: 600,
    background: 'rgba(0, 0, 0, 0.6)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  captureBtn: {
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    fontWeight: 600,
    background: '#111111',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    minWidth: '200px',
  },
  retakeBtn: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    background: 'transparent',
    color: '#555',
    border: '1px solid #ccc',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    fontWeight: 600,
    background: '#111111',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  warningText: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#c33',
    textAlign: 'center',
  },
};
