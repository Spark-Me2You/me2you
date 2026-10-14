/**
 * Assigns detected poses to players by which half of the camera frame they stand in.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PoseLandmark } from "@/shared/utils/gestureConstants";
import { FLAPFLAP_2P_CONFIG } from "../config/flapflap2pConfig";
import type { PlayerId } from "../types/flapflap2p";

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

/**
 * The camera feed is displayed mirrored, so a player standing on the left of
 * the screen appears at raw x > SPLIT_X. If several people are on one side,
 * the one closest to the camera wins.
 */
export function assignPosesToPlayers(
  poses: NormalizedLandmark[][],
): PlayerPoses {
  const result: PlayerPoses = { P1: null, P2: null };

  for (const landmarks of poses) {
    const centerX = getBodyCenterX(landmarks);
    if (centerX === null) continue;

    const player: PlayerId =
      centerX >= FLAPFLAP_2P_CONFIG.SPLIT_X ? "P1" : "P2";
    const current = result[player];
    if (!current || getShoulderWidth(landmarks) > getShoulderWidth(current)) {
      result[player] = landmarks;
    }
  }

  return result;
}
