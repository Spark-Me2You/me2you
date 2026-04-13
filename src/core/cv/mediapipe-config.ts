/**
 * MediaPipe Configuration
 * TODO: Configure pose detection settings
 */

export const poseLandmarkerConfig = {
  // Fetch directly from Google Cloud Storage CDN
  modelAssetPath:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  runningMode: "VIDEO" as const,
};

export const faceMeshConfig = {
  // TODO: Configure MediaPipe face mesh settings
  modelAssetPath: "/models/face_mesh.task",
  runningMode: "VIDEO" as const,
  numFaces: 1,
};

export const gestureRecognizerConfig = {
  // Fetch directly from Google Cloud Storage CDN
  modelAssetPath:
    "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task",
  runningMode: "VIDEO" as const,
  numHands: 1,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

export const imageSegmenterConfig = {
  // selfie_multiclass model for hair + face segmentation
  // Must be served locally (CORS restrictions on Google Storage)
  modelAssetPath: "/models/selfie_multiclass_256x256.tflite",
  runningMode: "IMAGE" as const,
  outputCategoryMask: true,
  outputConfidenceMasks: true, // For smoother hair edge blending
};

export const faceLandmarkerConfig = {
  // FaceLandmarker for 468 facial landmarks
  modelAssetPath:
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
  runningMode: "IMAGE" as const,
  numFaces: 1,
  minFaceDetectionConfidence: 0.5,
  minFacePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  outputFaceBlendshapes: false, // Not needed for landmarks only
  outputFacialTransformationMatrixes: false,
};
