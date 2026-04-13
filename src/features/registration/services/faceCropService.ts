/**
 * Face Crop Service
 * Client-side head isolation using MediaPipe ImageSegmenter + FaceLandmarker
 * Extracts head shape (hair + face pixels) with transparent background
 */

import {
  createImageSegmenter,
  createFaceLandmarker,
  imageSegmenterConfig,
  faceLandmarkerConfig,
} from '@/core/cv';
import type {
  ImageSegmenter,
  ImageSegmenterResult,
  FaceLandmarker,
  FaceLandmarkerResult,
} from '@/core/cv';

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
 * Head bounding box (pixel coordinates)
 */
export interface HeadBounds {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  width: number;
  height: number;
}

/**
 * Face landmark positions (normalized 0-1 coordinates)
 * Key landmarks extracted from MediaPipe's 468-point face mesh
 */
export interface FaceLandmarks {
  leftEye: { x: number; y: number }; // Landmark 33 (left eye center)
  rightEye: { x: number; y: number }; // Landmark 263 (right eye center)
  noseTip: { x: number; y: number }; // Landmark 1 (nose tip)
  mouthCenter: { x: number; y: number }; // Landmark 13 (upper lip center)
  faceCenter: { x: number; y: number }; // Calculated centroid
  chinBottom: { x: number; y: number }; // Landmark 152 (chin bottom)
  foreheadTop: { x: number; y: number }; // Landmark 10 (forehead top)
}

/**
 * Metadata about the crop operation
 */
export interface CropMetadata {
  faceDetected: boolean;
  headBounds: HeadBounds | null; // Actual head pixel bounds
  boundingBox: FaceBoundingBox | null; // For backward compatibility
  confidence: number;
  outputSize: { width: number; height: number };
  padding: number;
  processingTimeMs: number;
  landmarks: FaceLandmarks | null; // Face landmark positions
  segmentationMaskUsed: boolean; // Whether segmentation succeeded
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
 * Options for head isolation
 */
export interface CropOptions {
  padding?: number; // Default: 0.08 (8% padding around head)
  edgeBlurRadius?: number; // Default: 2 (pixels to blur mask edges)
  includeLandmarks?: boolean; // Default: true (run FaceLandmarker)
}

// Segmentation category indices from selfie_multiclass model
const CATEGORY_HAIR = 1;
const CATEGORY_FACE_SKIN = 3;
const HEAD_CATEGORIES = [CATEGORY_HAIR, CATEGORY_FACE_SKIN];

// Singleton instances (lazy loaded)
let imageSegmenterInstance: ImageSegmenter | null = null;
let faceLandmarkerInstance: FaceLandmarker | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize both ImageSegmenter and FaceLandmarker (lazy load MediaPipe models)
 * Can be called multiple times safely (subsequent calls return immediately)
 */
const initialize = async (): Promise<void> => {
  if (imageSegmenterInstance && faceLandmarkerInstance) {
    return; // Already initialized
  }

  if (isInitializing && initializationPromise) {
    return initializationPromise; // Wait for ongoing initialization
  }

  isInitializing = true;
  initializationPromise = (async () => {
    try {
      console.log('[faceCropService] Initializing ImageSegmenter and FaceLandmarker...');

      // Load both models in parallel
      const [segmenter, landmarker] = await Promise.all([
        createImageSegmenter(imageSegmenterConfig),
        createFaceLandmarker(faceLandmarkerConfig),
      ]);

      imageSegmenterInstance = segmenter;
      faceLandmarkerInstance = landmarker;

      console.log('[faceCropService] Models initialized successfully');
    } catch (error) {
      console.error('[faceCropService] Failed to initialize models:', error);
      throw new Error('Failed to load head isolation models');
    } finally {
      isInitializing = false;
    }
  })();

  return initializationPromise;
};

/**
 * Check if the models are ready
 */
const isReady = (): boolean => {
  return imageSegmenterInstance !== null && faceLandmarkerInstance !== null;
};

/**
 * Create binary mask from segmentation result
 * @param segmentationResult MediaPipe segmentation result
 * @param imageWidth Image width in pixels
 * @param imageHeight Image height in pixels
 * @returns Binary mask (255 for head pixels, 0 for background) and head bounds
 */
const segmentHead = (
  segmentationResult: ImageSegmenterResult,
  imageWidth: number,
  imageHeight: number
): { mask: Uint8ClampedArray; bounds: HeadBounds | null } => {
  const mask = new Uint8ClampedArray(imageWidth * imageHeight);
  const categoryMask = segmentationResult.categoryMask?.getAsUint8Array();
  if (!categoryMask) {
    return { mask, bounds: null };
  }

  // Create binary mask: 255 for head pixels, 0 for background
  let xMin = imageWidth,
    yMin = imageHeight,
    xMax = 0,
    yMax = 0;
  let hasHeadPixels = false;

  for (let i = 0; i < categoryMask.length; i++) {
    const category = categoryMask[i];
    if (HEAD_CATEGORIES.includes(category)) {
      mask[i] = 255;
      hasHeadPixels = true;

      const x = i % imageWidth;
      const y = Math.floor(i / imageWidth);
      xMin = Math.min(xMin, x);
      yMin = Math.min(yMin, y);
      xMax = Math.max(xMax, x);
      yMax = Math.max(yMax, y);
    }
  }

  if (!hasHeadPixels) {
    return { mask, bounds: null };
  }

  return {
    mask,
    bounds: {
      xMin,
      yMin,
      xMax,
      yMax,
      width: xMax - xMin,
      height: yMax - yMin,
    },
  };
};

/**
 * Extract key face landmarks from MediaPipe result
 * @param landmarkerResult MediaPipe face landmarker result
 * @returns Face landmarks or null if no face detected
 */
const extractLandmarks = (
  landmarkerResult: FaceLandmarkerResult
): FaceLandmarks | null => {
  if (!landmarkerResult.faceLandmarks?.length) {
    return null;
  }

  const landmarks = landmarkerResult.faceLandmarks[0];
  const requiredIndices = [1, 10, 13, 33, 152, 263];
  const maxRequiredIndex = Math.max(...requiredIndices);
  if (!landmarks || landmarks.length <= maxRequiredIndex) {
    return null;
  }

  // MediaPipe face mesh indices for key landmarks
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const noseTip = landmarks[1];
  const mouthCenter = landmarks[13];
  const chinBottom = landmarks[152];
  const foreheadTop = landmarks[10];

  if (!leftEye || !rightEye || !noseTip || !mouthCenter || !chinBottom || !foreheadTop) {
    return null;
  }

  return {
    leftEye: { x: leftEye.x, y: leftEye.y },
    rightEye: { x: rightEye.x, y: rightEye.y },
    noseTip: { x: noseTip.x, y: noseTip.y },
    mouthCenter: { x: mouthCenter.x, y: mouthCenter.y },
    faceCenter: {
      x: (leftEye.x + rightEye.x) / 2,
      y: (noseTip.y + mouthCenter.y) / 2,
    },
    chinBottom: { x: chinBottom.x, y: chinBottom.y },
    foreheadTop: { x: foreheadTop.x, y: foreheadTop.y },
  };
};

/**
 * Convert head bounds to normalized bounding box (for backward compatibility)
 */
const boundsToNormalizedBox = (
  bounds: HeadBounds,
  imageWidth: number,
  imageHeight: number
): FaceBoundingBox => {
  return {
    x: bounds.xMin / imageWidth,
    y: bounds.yMin / imageHeight,
    width: bounds.width / imageWidth,
    height: bounds.height / imageHeight,
  };
};

/**
 * Apply segmentation mask to image and crop to head bounds
 * @param sourceCanvas Canvas containing the original image
 * @param mask Binary mask (255 for head, 0 for background)
 * @param bounds Head pixel bounds
 * @param padding Padding percentage around head
 * @returns Canvas with transparent background, cropped to head bounds
 */
const applyMaskToCanvas = (
  sourceCanvas: HTMLCanvasElement,
  mask: Uint8ClampedArray,
  bounds: HeadBounds,
  padding: number
): HTMLCanvasElement => {
  // Calculate padded bounds
  const padX = Math.round(bounds.width * padding);
  const padY = Math.round(bounds.height * padding);
  const cropX = Math.max(0, bounds.xMin - padX);
  const cropY = Math.max(0, bounds.yMin - padY);
  const cropW = Math.min(sourceCanvas.width - cropX, bounds.width + 2 * padX);
  const cropH = Math.min(sourceCanvas.height - cropY, bounds.height + 2 * padY);

  // Create output canvas at cropped dimensions
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = cropW;
  outputCanvas.height = cropH;
  const ctx = outputCanvas.getContext('2d')!;

  // Draw cropped region from source
  ctx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // Get image data and apply mask
  const imageData = ctx.getImageData(0, 0, cropW, cropH);
  const data = imageData.data;

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcX = cropX + x;
      const srcY = cropY + y;
      const maskIdx = srcY * sourceCanvas.width + srcX;
      const pixelIdx = (y * cropW + x) * 4;

      // Set alpha based on mask (255 = opaque, 0 = transparent)
      data[pixelIdx + 3] = mask[maskIdx] ?? 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return outputCanvas;
};

/**
 * Load image blob into HTMLImageElement
 */
const loadImage = async (blob: Blob): Promise<HTMLImageElement> => {
  const imageUrl = URL.createObjectURL(blob);
  const img = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }

  return img;
};

/**
 * Crop image to isolated head shape with transparent background
 * @param imageBlob Input image blob
 * @param options Crop options (padding, edgeBlurRadius, includeLandmarks)
 * @returns Promise resolving to crop result with PNG blob
 * @throws FaceNotDetectedError if no head detected in segmentation
 * @throws Error for other processing errors
 */
const cropFace = async (
  imageBlob: Blob,
  options: CropOptions = {}
): Promise<CropResult> => {
  const startTime = performance.now();
  const {
    padding = 0.08,
    includeLandmarks = true,
  } = options;

  // Ensure models are initialized
  await initialize();
  if (!imageSegmenterInstance || !faceLandmarkerInstance) {
    throw new Error('Models not initialized');
  }

  try {
    // Load image
    console.log('[faceCropService] Loading image...');
    const img = await loadImage(imageBlob);

    // Run segmentation
    console.log('[faceCropService] Running segmentation...');
    const segmentationResult = imageSegmenterInstance.segment(img);
    const { mask, bounds } = segmentHead(
      segmentationResult,
      img.width,
      img.height
    );

    if (!bounds) {
      console.warn('[faceCropService] No head detected in segmentation');
      throw new FaceNotDetectedError('No head detected in segmentation');
    }

    console.log('[faceCropService] Head detected');

    // Run landmark detection (if enabled)
    let landmarks: FaceLandmarks | null = null;
    let confidence = 0;

    if (includeLandmarks) {
      console.log('[faceCropService] Extracting landmarks...');
      const landmarkResult = faceLandmarkerInstance.detect(img);
      landmarks = extractLandmarks(landmarkResult);
      confidence = landmarks ? 0.95 : 0;

      if (landmarks) {
        console.log('[faceCropService] Landmarks extracted');
      } else {
        console.warn('[faceCropService] No landmarks detected');
      }
    }

    // Create source canvas from image
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = img.width;
    sourceCanvas.height = img.height;
    const sourceCtx = sourceCanvas.getContext('2d')!;
    sourceCtx.drawImage(img, 0, 0);

    // Apply mask and crop
    console.log('[faceCropService] Applying mask and cropping...');
    const outputCanvas = applyMaskToCanvas(
      sourceCanvas,
      mask,
      bounds,
      padding
    );

    // Convert to PNG blob (for transparency)
    const croppedBlob = await new Promise<Blob>((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('Failed to create PNG blob')),
        'image/png'
      );
    });

    const processingTime = performance.now() - startTime;

    console.log('[faceCropService] Head isolation complete:', {
      processingTimeMs: Math.round(processingTime),
      outputSize: { width: outputCanvas.width, height: outputCanvas.height },
      landmarks: landmarks ? 'detected' : 'not detected',
    });

    return {
      originalBlob: imageBlob,
      croppedBlob,
      cropMetadata: {
        faceDetected: true,
        headBounds: bounds,
        boundingBox: boundsToNormalizedBox(bounds, img.width, img.height),
        confidence,
        outputSize: {
          width: outputCanvas.width,
          height: outputCanvas.height,
        },
        padding,
        processingTimeMs: Math.round(processingTime),
        landmarks,
        segmentationMaskUsed: true,
      },
    };
  } catch (error) {
    // Preserve FaceNotDetectedError
    if (error instanceof FaceNotDetectedError) {
      throw error;
    }

    console.error('[faceCropService] Processing error:', error);
    throw new Error('Failed to process photo');
  }
};

/**
 * Dispose of model instances
 * Call on unmount to free GPU memory
 */
const dispose = (): void => {
  if (imageSegmenterInstance) {
    console.log('[faceCropService] Disposing ImageSegmenter');
    imageSegmenterInstance.close();
    imageSegmenterInstance = null;
  }

  if (faceLandmarkerInstance) {
    console.log('[faceCropService] Disposing FaceLandmarker');
    faceLandmarkerInstance.close();
    faceLandmarkerInstance = null;
  }
};

/**
 * Face Crop Service
 * Provides client-side head isolation with transparent background
 */
export const faceCropService = {
  initialize,
  isReady,
  cropFace,
  dispose,
};
