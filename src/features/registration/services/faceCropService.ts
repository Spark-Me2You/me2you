/**
 * Face Crop Service
 * Client-side face detection and cropping using MediaPipe FaceDetector
 */

import { createFaceDetector, faceDetectorConfig } from '@/core/cv';
import type { FaceDetector } from '@/core/cv';

/**
 * Custom error for when no face is detected
 * Allows UI to differentiate between "no face" vs other processing errors
 */
export class FaceNotDetectedError extends Error {
  constructor(message = 'No face detected in photo') {
    super(message);
    this.name = 'FaceNotDetectedError';
  }
}

/**
 * Face bounding box (normalized coordinates 0-1)
 */
export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Metadata about the crop operation
 */
export interface CropMetadata {
  faceDetected: boolean;
  boundingBox: FaceBoundingBox | null;
  confidence: number;
  outputSize: { width: number; height: number };
  padding: number;
  processingTimeMs: number;
}

/**
 * Result from cropFace operation
 */
export interface CropResult {
  originalBlob: Blob;
  croppedBlob: Blob;
  cropMetadata: CropMetadata;
}

/**
 * Options for cropping
 */
export interface CropOptions {
  outputSize?: number; // Default: 400
  padding?: number; // Default: 0.25 (25%)
  quality?: number; // Default: 0.85 (85%)
}

// Singleton face detector instance
let faceDetectorInstance: FaceDetector | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the face detector (lazy load MediaPipe model)
 * Can be called multiple times safely (subsequent calls return immediately)
 */
const initialize = async (): Promise<void> => {
  if (faceDetectorInstance) {
    return; // Already initialized
  }

  if (isInitializing && initializationPromise) {
    return initializationPromise; // Wait for ongoing initialization
  }

  isInitializing = true;
  initializationPromise = (async () => {
    try {
      console.log('[faceCropService] Initializing FaceDetector...');
      faceDetectorInstance = await createFaceDetector(faceDetectorConfig);
      console.log('[faceCropService] FaceDetector initialized successfully');
    } catch (error) {
      console.error('[faceCropService] Failed to initialize FaceDetector:', error);
      throw new Error('Failed to load face detection model');
    } finally {
      isInitializing = false;
    }
  })();

  return initializationPromise;
};

/**
 * Check if the face detector is ready
 */
const isReady = (): boolean => {
  return faceDetectorInstance !== null;
};

/**
 * Calculate crop region with padding around face bounding box
 * @param imageWidth Image width in pixels
 * @param imageHeight Image height in pixels
 * @param face Normalized face bounding box (0-1)
 * @param padding Padding percentage (0.25 = 25%)
 * @returns Crop region in pixel coordinates
 */
const calculateCropRegion = (
  imageWidth: number,
  imageHeight: number,
  face: FaceBoundingBox,
  padding: number
): { x: number; y: number; size: number } => {
  // Convert normalized coords to pixels
  const faceX = face.x * imageWidth;
  const faceY = face.y * imageHeight;
  const faceWidth = face.width * imageWidth;
  const faceHeight = face.height * imageHeight;

  // Apply padding around face
  const faceSize = Math.max(faceWidth, faceHeight);
  const paddedSize = faceSize * (1 + padding);

  // Center the padded region on the face
  let cropX = faceX + faceWidth / 2 - paddedSize / 2;
  let cropY = faceY + faceHeight / 2 - paddedSize / 2;

  // Clamp to image bounds
  cropX = Math.max(0, Math.min(cropX, imageWidth - paddedSize));
  cropY = Math.max(0, Math.min(cropY, imageHeight - paddedSize));

  // Ensure square crop fits in image
  const maxSize = Math.min(
    imageWidth - cropX,
    imageHeight - cropY,
    paddedSize
  );

  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    size: Math.round(maxSize),
  };
};

/**
 * Crop image around detected face
 * @param imageBlob Input image blob
 * @param options Crop options (outputSize, padding, quality)
 * @returns Promise resolving to crop result
 * @throws FaceNotDetectedError if no face detected
 * @throws Error for other processing errors
 */
const cropFace = async (
  imageBlob: Blob,
  options: CropOptions = {}
): Promise<CropResult> => {
  const startTime = performance.now();
  const { outputSize = 400, padding = 0.25, quality = 0.85 } = options;

  // Ensure detector is initialized
  await initialize();
  if (!faceDetectorInstance) {
    throw new Error('Face detector not initialized');
  }

  try {
    // Load image into HTMLImageElement
    const imageUrl = URL.createObjectURL(imageBlob);
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });

    // Detect face
    console.log('[faceCropService] Detecting face...');
    const detectionResult = faceDetectorInstance.detect(img);
    URL.revokeObjectURL(imageUrl);

    // Check if face detected
    if (!detectionResult.detections || detectionResult.detections.length === 0) {
      console.warn('[faceCropService] No face detected');
      throw new FaceNotDetectedError();
    }

    // Get first detected face
    const detection = detectionResult.detections[0];
    const boundingBox = detection.boundingBox;
    const confidence = detection.categories?.[0]?.score ?? 0;

    console.log('[faceCropService] Face detected:', {
      confidence,
      box: boundingBox,
    });

    // Normalize bounding box
    const normalizedBox: FaceBoundingBox = {
      x: boundingBox.originX / img.width,
      y: boundingBox.originY / img.height,
      width: boundingBox.width / img.width,
      height: boundingBox.height / img.height,
    };

    // Calculate crop region
    const cropRegion = calculateCropRegion(
      img.width,
      img.height,
      normalizedBox,
      padding
    );

    console.log('[faceCropService] Crop region:', cropRegion);

    // Create canvas and crop
    const canvas = document.createElement('canvas');
    canvas.width = cropRegion.size;
    canvas.height = cropRegion.size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Draw cropped region
    ctx.drawImage(
      img,
      cropRegion.x,
      cropRegion.y,
      cropRegion.size,
      cropRegion.size,
      0,
      0,
      cropRegion.size,
      cropRegion.size
    );

    // Resize to output size if needed
    if (cropRegion.size !== outputSize) {
      const resizeCanvas = document.createElement('canvas');
      resizeCanvas.width = outputSize;
      resizeCanvas.height = outputSize;
      const resizeCtx = resizeCanvas.getContext('2d');

      if (!resizeCtx) {
        throw new Error('Failed to get resize canvas context');
      }

      resizeCtx.drawImage(canvas, 0, 0, outputSize, outputSize);
      canvas.width = outputSize;
      canvas.height = outputSize;
      ctx.drawImage(resizeCanvas, 0, 0);
    }

    // Convert to blob
    const croppedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create cropped blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });

    const processingTime = performance.now() - startTime;

    console.log('[faceCropService] Crop complete:', {
      processingTimeMs: Math.round(processingTime),
      outputSize: { width: outputSize, height: outputSize },
    });

    return {
      originalBlob: imageBlob,
      croppedBlob,
      cropMetadata: {
        faceDetected: true,
        boundingBox: normalizedBox,
        confidence,
        outputSize: { width: outputSize, height: outputSize },
        padding,
        processingTimeMs: Math.round(processingTime),
      },
    };
  } catch (error) {
    const processingTime = performance.now() - startTime;

    // Preserve FaceNotDetectedError
    if (error instanceof FaceNotDetectedError) {
      throw error;
    }

    console.error('[faceCropService] Crop error:', error);
    throw new Error('Failed to process photo');
  }
};

/**
 * Dispose of the face detector instance
 * Call on unmount to free GPU memory
 */
const dispose = (): void => {
  if (faceDetectorInstance) {
    console.log('[faceCropService] Disposing FaceDetector');
    faceDetectorInstance.close();
    faceDetectorInstance = null;
  }
};

/**
 * Face Crop Service
 * Provides client-side face detection and cropping
 */
export const faceCropService = {
  initialize,
  isReady,
  cropFace,
  dispose,
};
