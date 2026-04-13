/**
 * useFaceCrop Hook
 * React hook for face cropping with loading and error state management
 */

import { useState, useEffect, useCallback } from 'react';
import {
  faceCropService,
  FaceNotDetectedError,
  type CropResult,
} from '../services/faceCropService';

/**
 * Return type for useFaceCrop hook
 */
export interface UseFaceCropReturn {
  /**
   * Whether the face detector is initializing (loading model)
   */
  isInitializing: boolean;

  /**
   * Whether a crop operation is in progress
   */
  isProcessing: boolean;

  /**
   * Error message if crop failed (null if no error)
   */
  error: string | null;

  /**
   * Crop a photo (detects face and crops)
   * @param blob Input image blob
   * @returns Promise resolving to crop result
   * @throws FaceNotDetectedError if no face detected
   */
  cropPhoto: (blob: Blob) => Promise<CropResult>;

  /**
   * Clear the error state
   */
  clearError: () => void;
}

/**
 * Hook for face cropping with state management
 * Automatically initializes face detector on mount and cleans up on unmount
 *
 * @returns Face crop utilities and state
 *
 * @example
 * ```typescript
 * const { isInitializing, isProcessing, error, cropPhoto, clearError } = useFaceCrop();
 *
 * const handleCapture = async (blob: Blob) => {
 *   try {
 *     const result = await cropPhoto(blob);
 *     setCroppedPhoto(result.croppedBlob);
 *   } catch (error) {
 *     if (error instanceof FaceNotDetectedError) {
 *       showRetakePrompt();
 *     }
 *   }
 * };
 * ```
 */
export const useFaceCrop = (): UseFaceCropReturn => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize face detector on mount
  useEffect(() => {
    const init = async () => {
      try {
        console.log('[useFaceCrop] Initializing face detector...');
        await faceCropService.initialize();
        console.log('[useFaceCrop] Face detector ready');
        setIsInitializing(false);
      } catch (err) {
        console.error('[useFaceCrop] Initialization failed:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load face detector'
        );
        setIsInitializing(false);
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      faceCropService.dispose();
    };
  }, []);

  /**
   * Crop a photo
   */
  const cropPhoto = useCallback(
    async (blob: Blob): Promise<CropResult> => {
      setIsProcessing(true);
      setError(null);

      try {
        const result = await faceCropService.cropFace(blob);
        setIsProcessing(false);
        return result;
      } catch (err) {
        setIsProcessing(false);

        // Preserve FaceNotDetectedError for caller to handle
        if (err instanceof FaceNotDetectedError) {
          throw err;
        }

        // Other errors - set error state and rethrow
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to process photo';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isInitializing,
    isProcessing,
    error,
    cropPhoto,
    clearError,
  };
};
