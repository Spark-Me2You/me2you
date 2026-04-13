/**
 * Face Detector Configuration
 * MediaPipe FaceDetector for client-side face cropping
 */

export const faceDetectorConfig = {
  /**
   * BlazeFace Short Range model
   * Optimized for faces within 2 meters of the camera
   * Model size: ~2MB
   */
  modelAssetPath:
    'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite',

  /**
   * Running mode: IMAGE (for single frame detection)
   * Use IMAGE mode for static photos, not VIDEO mode for continuous detection
   */
  runningMode: 'IMAGE' as const,

  /**
   * Minimum confidence threshold for face detection (0.0 - 1.0)
   * 0.5 provides good balance between false positives and false negatives
   */
  minDetectionConfidence: 0.5,
};
