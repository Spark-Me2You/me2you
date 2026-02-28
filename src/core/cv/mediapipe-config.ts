/**
 * MediaPipe Configuration
 * TODO: Configure pose detection settings
 */

export const mediapipeConfig = {
  // TODO: Configure MediaPipe pose landmarker settings
  modelAssetPath: '/models/pose_landmarker.task',
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  runningMode: 'VIDEO' as const,
};

export const faceMeshConfig = {
  // TODO: Configure MediaPipe face mesh settings
  modelAssetPath: '/models/face_mesh.task',
  runningMode: 'VIDEO' as const,
  numFaces: 1,
};
