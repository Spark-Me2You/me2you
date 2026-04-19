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
  ImageSegmenter,
  ImageSegmenterResult,
  FaceLandmarker,
  FaceLandmarkerResult,
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

// Cache the loaded modules to avoid re-importing
let mediapipeVisionModule: typeof import("@mediapipe/tasks-vision") | null =
  null;

const VISION_WASM_TIMEOUT_MS = 30000;
const TASK_CREATE_TIMEOUT_MS = 30000;

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

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
  const vision = await withTimeout(
    FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
    ),
    VISION_WASM_TIMEOUT_MS,
    "Load GestureRecognizer vision fileset",
  );

  // Create GestureRecognizer instance with configuration
  const gestureRecognizer = await withTimeout(
    GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: config.modelAssetPath,
        delegate: "GPU", // Use GPU acceleration if available
      },
      runningMode: config.runningMode,
      numHands: config.numHands,
      minHandDetectionConfidence: config.minHandDetectionConfidence,
      minHandPresenceConfidence: config.minHandPresenceConfidence,
      minTrackingConfidence: config.minTrackingConfidence,
    }),
    TASK_CREATE_TIMEOUT_MS,
    "Create GestureRecognizer task",
  );

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
  const vision = await withTimeout(
    FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
    ),
    VISION_WASM_TIMEOUT_MS,
    "Load FaceDetector vision fileset",
  );

  // Create FaceDetector instance with configuration
  const faceDetector = await withTimeout(
    FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: config.modelAssetPath,
        delegate: "GPU", // Use GPU acceleration if available
      },
      runningMode: config.runningMode,
      minDetectionConfidence: config.minDetectionConfidence,
    }),
    TASK_CREATE_TIMEOUT_MS,
    "Create FaceDetector task",
  );

  return faceDetector;
};

/**
 * Create an ImageSegmenter instance with lazy loading
 * @param config Configuration options for the image segmenter
 * @returns Promise resolving to an ImageSegmenter instance
 */
export const createImageSegmenter = async (config: {
  modelAssetPath: string;
  runningMode: "IMAGE" | "VIDEO";
  outputCategoryMask: boolean;
  outputConfidenceMasks: boolean;
}): Promise<ImageSegmenter> => {
  const { FilesetResolver, ImageSegmenter } = await loadMediaPipeVision();

  /**
   * IMPORTANT: WASM version must match package.json version exactly
   * When upgrading @mediapipe/tasks-vision, update this URL version
   * Current package version: 0.10.32
   */
  const vision = await withTimeout(
    FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
    ),
    VISION_WASM_TIMEOUT_MS,
    "Load ImageSegmenter vision fileset",
  );

  // Create ImageSegmenter instance with configuration
  const imageSegmenter = await withTimeout(
    ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: config.modelAssetPath,
        delegate: "GPU", // Use GPU acceleration if available
      },
      runningMode: config.runningMode,
      outputCategoryMask: config.outputCategoryMask,
      outputConfidenceMasks: config.outputConfidenceMasks,
    }),
    TASK_CREATE_TIMEOUT_MS,
    "Create ImageSegmenter task",
  );

  return imageSegmenter;
};

/**
 * Create a FaceLandmarker instance with lazy loading
 * @param config Configuration options for the face landmarker
 * @returns Promise resolving to a FaceLandmarker instance
 */
export const createFaceLandmarker = async (config: {
  modelAssetPath: string;
  runningMode: "IMAGE" | "VIDEO";
  numFaces: number;
  minFaceDetectionConfidence: number;
  minFacePresenceConfidence: number;
  minTrackingConfidence: number;
  outputFaceBlendshapes: boolean;
  outputFacialTransformationMatrixes: boolean;
}): Promise<FaceLandmarker> => {
  const { FilesetResolver, FaceLandmarker } = await loadMediaPipeVision();

  /**
   * IMPORTANT: WASM version must match package.json version exactly
   * When upgrading @mediapipe/tasks-vision, update this URL version
   * Current package version: 0.10.32
   */
  const vision = await withTimeout(
    FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
    ),
    VISION_WASM_TIMEOUT_MS,
    "Load FaceLandmarker vision fileset",
  );

  // Create FaceLandmarker instance with configuration
  const faceLandmarker = await withTimeout(
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: config.modelAssetPath,
        delegate: "GPU", // Use GPU acceleration if available
      },
      runningMode: config.runningMode,
      numFaces: config.numFaces,
      minFaceDetectionConfidence: config.minFaceDetectionConfidence,
      minFacePresenceConfidence: config.minFacePresenceConfidence,
      minTrackingConfidence: config.minTrackingConfidence,
      outputFaceBlendshapes: config.outputFaceBlendshapes,
      outputFacialTransformationMatrixes:
        config.outputFacialTransformationMatrixes,
    }),
    TASK_CREATE_TIMEOUT_MS,
    "Create FaceLandmarker task",
  );

  return faceLandmarker;
};

/**
 * Create a PoseLandmarker instance with lazy loading
 * @param config Configuration options for the pose landmarker
 * @returns Promise resolving to a PoseLandmarker instance
 */
export const createPoseLandmarker = async (config: {
  modelAssetPath: string;
  runningMode: "IMAGE" | "VIDEO";
  numPoses: number;
  minPoseDetectionConfidence: number;
  minPosePresenceConfidence: number;
  minTrackingConfidence: number;
}): Promise<PoseLandmarker> => {
  const { FilesetResolver, PoseLandmarker } = await loadMediaPipeVision();

  /**
   * IMPORTANT: WASM version must match package.json version exactly
   * When upgrading @mediapipe/tasks-vision, update this URL version
   * Current package version: 0.10.32
   */
  const vision = await withTimeout(
    FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
    ),
    VISION_WASM_TIMEOUT_MS,
    "Load PoseLandmarker vision fileset",
  );

  // Create PoseLandmarker instance with configuration
  const poseLandmarker = await withTimeout(
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: config.modelAssetPath,
        delegate: "GPU", // Use GPU acceleration if available
      },
      runningMode: config.runningMode,
      numPoses: config.numPoses,
      minPoseDetectionConfidence: config.minPoseDetectionConfidence,
      minPosePresenceConfidence: config.minPosePresenceConfidence,
      minTrackingConfidence: config.minTrackingConfidence,
    }),
    TASK_CREATE_TIMEOUT_MS,
    "Create PoseLandmarker task",
  );

  return poseLandmarker;
};

// Re-export types for convenience
export type {
  GestureRecognizer,
  GestureRecognizerResult,
  FaceDetector,
  FaceDetectorResult,
  ImageSegmenter,
  ImageSegmenterResult,
  FaceLandmarker,
  FaceLandmarkerResult,
  PoseLandmarker,
  PoseLandmarkerResult,
  FilesetResolver,
};
