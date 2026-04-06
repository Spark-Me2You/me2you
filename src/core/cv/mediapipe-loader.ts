/**
 * MediaPipe Lazy Loader
 * Dynamically imports MediaPipe modules only when needed to reduce initial bundle size
 */

import type {
  FilesetResolver,
  GestureRecognizer,
  GestureRecognizerResult,
  FaceDetector,
  FaceDetectorResult,
} from "@mediapipe/tasks-vision";

// Cache the loaded modules to avoid re-importing
let mediapipeVisionModule: typeof import("@mediapipe/tasks-vision") | null =
  null;

/**
 * Lazily load MediaPipe vision tasks module
 * @returns Promise resolving to the MediaPipe vision module
 */
export const loadMediaPipeVision = async () => {
  if (mediapipeVisionModule) {
    return mediapipeVisionModule;
  }

  // Dynamic import - this creates a separate chunk
  mediapipeVisionModule = await import("@mediapipe/tasks-vision");
  return mediapipeVisionModule;
};

/**
 * Create a GestureRecognizer instance with lazy loading
 * @param config Configuration options for the gesture recognizer
 * @returns Promise resolving to a GestureRecognizer instance
 */
export const createGestureRecognizer = async (config: {
  modelAssetPath: string;
  runningMode: "IMAGE" | "VIDEO";
  numHands: number;
  minHandDetectionConfidence: number;
  minHandPresenceConfidence: number;
  minTrackingConfidence: number;
}): Promise<GestureRecognizer> => {
  const { FilesetResolver, GestureRecognizer } = await loadMediaPipeVision();

  /**
   * IMPORTANT: WASM version must match package.json version exactly
   * When upgrading @mediapipe/tasks-vision, update this URL version
   * Current package version: 0.10.32
   */
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
  );

  // Create GestureRecognizer instance with configuration
  const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: config.modelAssetPath,
      delegate: "GPU", // Use GPU acceleration if available
    },
    runningMode: config.runningMode,
    numHands: config.numHands,
    minHandDetectionConfidence: config.minHandDetectionConfidence,
    minHandPresenceConfidence: config.minHandPresenceConfidence,
    minTrackingConfidence: config.minTrackingConfidence,
  });

  return gestureRecognizer;
};

/**
 * Create a FaceDetector instance with lazy loading
 * @param config Configuration options for the face detector
 * @returns Promise resolving to a FaceDetector instance
 */
export const createFaceDetector = async (config: {
  modelAssetPath: string;
  runningMode: "IMAGE" | "VIDEO";
  minDetectionConfidence: number;
}): Promise<FaceDetector> => {
  const { FilesetResolver, FaceDetector } = await loadMediaPipeVision();

  /**
   * IMPORTANT: WASM version must match package.json version exactly
   * When upgrading @mediapipe/tasks-vision, update this URL version
   * Current package version: 0.10.32
   */
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
  );

  // Create FaceDetector instance with configuration
  const faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: config.modelAssetPath,
      delegate: "GPU", // Use GPU acceleration if available
    },
    runningMode: config.runningMode,
    minDetectionConfidence: config.minDetectionConfidence,
  });

  return faceDetector;
};

// Re-export types for convenience
export type { GestureRecognizer, GestureRecognizerResult, FaceDetector, FaceDetectorResult, FilesetResolver };
