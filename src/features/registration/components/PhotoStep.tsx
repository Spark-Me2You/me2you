/**
 * PhotoStep Component
 * Photo capture/upload step for registration with gesture category selection
 */

import React, { useState, useRef, useCallback } from 'react';
import styles from './RegistrationSteps.module.css';

/**
 * Gesture category options
 */
const GESTURE_OPTIONS = [
  { value: 'wave', label: 'Wave', emoji: '👋' },
  { value: 'peace_sign', label: 'Peace Sign', emoji: '✌️' },
  { value: 'thumbs_up', label: 'Thumbs Up', emoji: '👍' },
] as const;

export type GestureCategory = typeof GESTURE_OPTIONS[number]['value'];

interface PhotoStepProps {
  onSubmit: (photo: Blob | null, category: GestureCategory) => Promise<boolean>;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
  onClearError: () => void;
}

/**
 * Compress and resize image
 * @param file - Original image file
 * @param maxWidth - Maximum width in pixels
 * @param quality - JPEG quality (0-1)
 * @returns Compressed image blob
 */
const compressImage = async (
  file: File,
  maxWidth = 1200,
  quality = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Resize if too large
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setLocalError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setLocalError('Image must be less than 10MB');
      return;
    }

    setLocalError(null);
    onClearError();
    setIsProcessing(true);

    try {
      // Compress the image
      const compressed = await compressImage(file);
      setPhoto(compressed);

      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch (err) {
      setLocalError('Failed to process image. Please try another.');
      console.error('Image processing error:', err);
    } finally {
      setIsProcessing(false);
    }

    // Reset input to allow selecting the same file again
    e.target.value = '';
  }, [previewUrl, onClearError]);

  const handleRemovePhoto = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPhoto(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const handleCameraClick = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const handleGalleryClick = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    if (!photo) {
      setLocalError('Please take or upload a photo');
      return;
    }

    await onSubmit(photo, category);
  };

  const displayError = localError || error;
  const isBusy = isSubmitting || isProcessing;

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Take Your Photo</h2>
        <p className={styles.stepDescription}>
          Strike your pose and take a selfie!
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
            <img
              src={previewUrl}
              alt="Profile preview"
              className={styles.photoPreview}
            />
          ) : (
            <div className={styles.photoPlaceholder}>
              📸<br />
              Tap the camera button below
            </div>
          )}

          <div className={styles.photoActions}>
            {/* Hidden camera input - opens front camera on mobile */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileSelect}
              className={styles.fileInput}
              disabled={isBusy}
            />
            {/* Hidden gallery input - for uploading existing photos */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={styles.fileInput}
              disabled={isBusy}
            />

            {previewUrl ? (
              <>
                <button
                  type="button"
                  className={styles.cameraButton}
                  onClick={handleCameraClick}
                  disabled={isBusy}
                >
                  {isProcessing ? 'Processing...' : '📷 Retake Photo'}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleRemovePhoto}
                  disabled={isBusy}
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.cameraButton}
                  onClick={handleCameraClick}
                  disabled={isBusy}
                >
                  {isProcessing ? 'Processing...' : '📷 Take Photo'}
                </button>
                <button
                  type="button"
                  className={styles.galleryButton}
                  onClick={handleGalleryClick}
                  disabled={isBusy}
                >
                  Choose from Gallery
                </button>
              </>
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
                <span className={styles.gestureEmoji}>{option.emoji}</span>
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
