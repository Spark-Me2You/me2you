/**
 * PhotoStep Component
 * Photo capture/upload step for registration
 */

import React, { useState, useRef, useCallback } from 'react';
import styles from './RegistrationSteps.module.css';

interface PhotoStepProps {
  onSubmit: (photo: Blob | null) => Promise<boolean>;
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
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCaptureClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    if (!photo) {
      setLocalError('Please take or upload a photo');
      return;
    }

    await onSubmit(photo);
  };

  const displayError = localError || error;
  const isBusy = isSubmitting || isProcessing;

  return (
    <div className={styles.stepContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Add Your Photo</h2>
        <p className={styles.stepDescription}>
          Take a selfie or upload a profile photo
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
              Tap below to take or upload a photo
            </div>
          )}

          <div className={styles.photoActions}>
            {/* Hidden file input - uses capture="user" for mobile front camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileSelect}
              className={styles.fileInput}
              disabled={isBusy}
            />

            {previewUrl ? (
              <>
                <button
                  type="button"
                  className={styles.uploadButton}
                  onClick={handleCaptureClick}
                  disabled={isBusy}
                >
                  {isProcessing ? 'Processing...' : 'Retake Photo'}
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
              <button
                type="button"
                className={styles.uploadButton}
                onClick={handleCaptureClick}
                disabled={isBusy}
              >
                {isProcessing ? 'Processing...' : 'Take or Upload Photo'}
              </button>
            )}
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
