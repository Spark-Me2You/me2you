/**
 * Pre-game framing check: every joint the poses use must be visible and
 * inside the camera frame, so a pose can be judged fairly.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PoseLandmark as L } from "@/shared/utils/gestureConstants";
import { HOLE_IN_THE_WALL_CONFIG } from "../config/holeInTheWallConfig";

const REQUIRED = [
  L.NOSE,
  L.LEFT_SHOULDER,
  L.RIGHT_SHOULDER,
  L.LEFT_ELBOW,
  L.RIGHT_ELBOW,
  L.LEFT_WRIST,
  L.RIGHT_WRIST,
  L.LEFT_HIP,
  L.RIGHT_HIP,
  L.LEFT_KNEE,
  L.RIGHT_KNEE,
  L.LEFT_ANKLE,
  L.RIGHT_ANKLE,
];

export function isFullBodyInFrame(
  landmarks: NormalizedLandmark[] | null,
): boolean {
  if (!landmarks) return false;
  const { MIN_LANDMARK_VISIBILITY: minVis, FRAME_MARGIN: margin } =
    HOLE_IN_THE_WALL_CONFIG;

  return REQUIRED.every((i) => {
    const lm = landmarks[i];
    return (
      !!lm &&
      (lm.visibility ?? 1) >= minVis &&
      lm.x >= margin &&
      lm.x <= 1 - margin &&
      lm.y >= margin &&
      lm.y <= 1 - margin
    );
  });
}
