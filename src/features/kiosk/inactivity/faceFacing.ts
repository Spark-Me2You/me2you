/**
 * Decide whether a BlazeFace detection is someone close enough and facing the screen.
 *
 * BlazeFace keypoints (normalized [0,1]): 0 right eye, 1 left eye, 2 nose tip,
 * 3 mouth, 4 right ear tragion, 5 left ear tragion. When a head turns, the nose
 * slides toward one eye, so the nose's horizontal offset from the eye midpoint,
 * relative to the eye spacing, gives a cheap yaw estimate.
 */

export interface FaceKeypoint {
  x: number;
  y: number;
}

export interface FaceDetectionLike {
  boundingBox?: { width: number };
  keypoints: FaceKeypoint[];
}

export interface FacingConfig {
  /** Max |nose offset| / eye spacing. ~0 is head-on; ~0.5 is about 45° of yaw. */
  maxYawRatio: number;
  /** Minimum face width as a fraction of the frame width, to ignore distant passers-by. */
  minFaceWidthFraction: number;
}

export const DEFAULT_FACING_CONFIG: FacingConfig = {
  maxYawRatio: 0.4,
  minFaceWidthFraction: 0.06,
};

export function isFacingScreen(
  detection: FaceDetectionLike,
  frameWidth: number,
  config: FacingConfig = DEFAULT_FACING_CONFIG,
): boolean {
  const box = detection.boundingBox;
  if (!box || frameWidth <= 0 || box.width / frameWidth < config.minFaceWidthFraction) return false;

  const [rightEye, leftEye, nose] = detection.keypoints;
  if (!rightEye || !leftEye || !nose) return false;

  const eyeSpacing = Math.abs(leftEye.x - rightEye.x);
  if (eyeSpacing === 0) return false;

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  return Math.abs(nose.x - eyeMidX) / eyeSpacing <= config.maxYawRatio;
}
