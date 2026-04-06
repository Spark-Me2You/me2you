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
