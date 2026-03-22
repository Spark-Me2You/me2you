/**
 * PhotoStep Component
 * Photo capture step using device camera with gesture category selection
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './RegistrationSteps.module.css';

/**
 * Gesture category options
 */
const GESTURE_OPTIONS = [
  { value: 'wave', label: 'Wave' },
  { value: 'peace_sign', label: 'Peace Sign' },
  { value: 'thumbs_up', label: 'Thumbs Up' },
] as const;

export type GestureCategory = typeof GESTURE_OPTIONS[number]['value'];

interface PhotoStepProps {
  onSubmit: (photo: Blob | null, category: GestureCategory) => Promise<boolean>;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
}

export const PhotoStep: React.FC<PhotoStepProps> = ({
  onSubmit,
  onBack,
  isSubmitting,
  error,
  onClearError,
}) => {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<GestureCategory>('wave');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera on mount
  useEffect(() => {
    startCamera();

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraReady(false);

    try {
      // Request camera access - prefer front camera on mobile
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera access denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('No camera found. Please connect a camera and try again.');
        } else {
          setCameraError(`Camera error: ${err.message}`);
        }
      } else {
        setCameraError('Failed to access camera. Please try again.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setLocalError(null);
    onClearError();

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Mirror the image horizontally (selfie mode)
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setPhoto(blob);

            // Create preview URL
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(URL.createObjectURL(blob));

            // Stop camera after capture
            stopCamera();
          } else {
            setLocalError('Failed to capture photo. Please try again.');
          }
          setIsProcessing(false);
        },
        'image/jpeg',
        0.9
      );
    } catch (err) {
      console.error('Photo capture error:', err);
      setLocalError('Failed to capture photo. Please try again.');
      setIsProcessing(false);
    }
  }, [previewUrl, onClearError]);

  const handleRetake = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPhoto(null);
    setPreviewUrl(null);
    startCamera();
  }, [previewUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    if (!photo) {
      setLocalError('Please take a photo');
      return;
    }

    await onSubmit(photo, category);
  };

  const displayError = localError || error || cameraError;
  const isBusy = isSubmitting || isProcessing;

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Take Your Photo</h2>
        <p className={styles.stepDescription}>
          Strike your pose and capture a photo
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {displayError && (
          <div className={styles.errorMessage}>
            {displayError}
          </div>
        )}

        <div className={styles.photoContainer}>
          {previewUrl ? (
            // Show captured photo preview
            <img
              src={previewUrl}
              alt="Profile preview"
              className={styles.photoPreview}
            />
          ) : (
            // Show live camera feed
            <div className={styles.cameraContainer}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={styles.cameraFeed}
              />
              {!isCameraReady && !cameraError && (
                <div className={styles.cameraLoading}>
                  Starting camera...
                </div>
              )}
            </div>
          )}

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className={styles.photoActions}>
            {previewUrl ? (
              <>
                <button
                  type="button"
                  className={styles.cameraButton}
                  onClick={handleRetake}
                  disabled={isBusy}
                >
                  Retake Photo
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.cameraButton}
                onClick={capturePhoto}
                disabled={isBusy || !isCameraReady}
              >
                {isProcessing ? 'Capturing...' : 'Capture Photo'}
              </button>
            )}
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>
            Select Your Gesture
          </label>
          <p className={styles.gestureHint}>
            This gesture will be used to reveal your photo at the kiosk
          </p>
          <div className={styles.gestureSelector}>
            {GESTURE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`${styles.gestureOption} ${category === option.value ? styles.gestureOptionSelected : ''}`}
              >
                <input
                  type="radio"
                  name="gesture"
                  value={option.value}
                  checked={category === option.value}
                  onChange={(e) => setCategory(e.target.value as GestureCategory)}
                  disabled={isBusy}
                  className={styles.gestureRadio}
                />
                <span className={styles.gestureLabel}>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onBack}
            disabled={isBusy}
          >
            Back
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isBusy || !photo}
          >
            {isSubmitting ? 'Uploading...' : 'Complete Registration'}
          </button>
        </div>
      </form>
    </div>
  );
};
