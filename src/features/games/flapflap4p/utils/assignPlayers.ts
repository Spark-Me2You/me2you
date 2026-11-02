/**
 * Assigns detected poses to players by which quarter of the camera frame they stand in.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PoseLandmark } from "@/shared/utils/gestureConstants";
import { FLAPFLAP_4P_CONFIG } from "../config/flapflap4pConfig";
import type { PlayerId } from "../types/flapflap4p";

export type PlayerPoses = Record<PlayerId, NormalizedLandmark[] | null>;

/** Horizontal body center (shoulder midpoint, falling back to nose). */
function getBodyCenterX(landmarks: NormalizedLandmark[]): number | null {
  const left = landmarks[PoseLandmark.LEFT_SHOULDER];
  const right = landmarks[PoseLandmark.RIGHT_SHOULDER];
  if (left && right) return (left.x + right.x) / 2;
  return landmarks[PoseLandmark.NOSE]?.x ?? null;
}

/** Shoulder width as a proxy for distance from camera (bigger = closer). */
function getShoulderWidth(landmarks: NormalizedLandmark[]): number {
  const left = landmarks[PoseLandmark.LEFT_SHOULDER];
  const right = landmarks[PoseLandmark.RIGHT_SHOULDER];
  if (!left || !right) return 0;
  return Math.abs(left.x - right.x);
}

/** Raw x >= 0.75 is P1, [0.5, 0.75) P2, [0.25, 0.5) P3, below 0.25 P4. */
function playerForX(x: number): PlayerId {
  const [s1, s2, s3] = FLAPFLAP_4P_CONFIG.SPLIT_XS;
  if (x >= s3) return "P1";
  if (x >= s2) return "P2";
  if (x >= s1) return "P3";
  return "P4";
}

/**
 * The camera feed is displayed mirrored, so P1 is the leftmost strip on screen.
 * If several people are in one strip, the one closest to the camera wins.
 */
export function assignPosesToPlayers(
  poses: NormalizedLandmark[][],
): PlayerPoses {
  const result: PlayerPoses = { P1: null, P2: null, P3: null, P4: null };

  for (const landmarks of poses) {
    const centerX = getBodyCenterX(landmarks);
    if (centerX === null) continue;

    const player = playerForX(centerX);
    const current = result[player];
    if (!current || getShoulderWidth(landmarks) > getShoulderWidth(current)) {
      result[player] = landmarks;
    }
  }

  return result;
}
