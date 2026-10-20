/**
 * Assigns detected poses to players by which half of the camera frame they stand in.
 * Same rule as FlapFlap 2P: the feed is mirrored, so raw x >= SPLIT_X is P1 (screen left).
 * If several people share a side, the one closest to the camera (widest shoulders) wins.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PoseLandmark } from "@/shared/utils/gestureConstants";
import { HOLE_IN_THE_WALL_CONFIG } from "../config/holeInTheWallConfig";
import type { PlayerId } from "../types/holeInTheWall";

export type PlayerPoses = Record<PlayerId, NormalizedLandmark[] | null>;

function getBodyCenterX(landmarks: NormalizedLandmark[]): number | null {
  const left = landmarks[PoseLandmark.LEFT_SHOULDER];
  const right = landmarks[PoseLandmark.RIGHT_SHOULDER];
  if (left && right) return (left.x + right.x) / 2;
  return landmarks[PoseLandmark.NOSE]?.x ?? null;
}

function getShoulderWidth(landmarks: NormalizedLandmark[]): number {
  const left = landmarks[PoseLandmark.LEFT_SHOULDER];
  const right = landmarks[PoseLandmark.RIGHT_SHOULDER];
  if (!left || !right) return 0;
  return Math.abs(left.x - right.x);
}

export function assignPosesToPlayers(
  poses: NormalizedLandmark[][],
): PlayerPoses {
  const result: PlayerPoses = { P1: null, P2: null };

  for (const landmarks of poses) {
    const centerX = getBodyCenterX(landmarks);
    if (centerX === null) continue;

    const player: PlayerId =
      centerX >= HOLE_IN_THE_WALL_CONFIG.SPLIT_X ? "P1" : "P2";
    const current = result[player];
    if (!current || getShoulderWidth(landmarks) > getShoulderWidth(current)) {
      result[player] = landmarks;
    }
  }

  return result;
}
