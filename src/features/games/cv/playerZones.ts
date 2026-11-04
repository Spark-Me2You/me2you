/**
 * Assigns detected poses to players by which vertical strip of the camera frame
 * they stand in. Strips are equal width and numbered from the left of the screen.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { PoseLandmark } from "@/shared/utils/gestureConstants";

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
 * Zone index for a raw landmark x. The feed is displayed mirrored, so zone 0
 * (left of the screen) is the highest raw x. A landmark exactly on a split
 * belongs to the zone further left on screen. MediaPipe can report x slightly
 * outside 0..1, so the result is clamped.
 */
export function getZoneForX(x: number, zoneCount: number): number {
  const zone = zoneCount - 1 - Math.floor(x * zoneCount);
  return Math.min(Math.max(zone, 0), zoneCount - 1);
}

/**
 * Returns one entry per zone: the pose standing there, or null if it is empty.
 * If several people share a zone, the one closest to the camera wins.
 */
export function assignPosesToZones(
  poses: NormalizedLandmark[][],
  zoneCount: number,
): (NormalizedLandmark[] | null)[] {
  const zones: (NormalizedLandmark[] | null)[] = Array.from(
    { length: zoneCount },
    () => null,
  );

  for (const landmarks of poses) {
    const centerX = getBodyCenterX(landmarks);
    if (centerX === null) continue;

    const zone = getZoneForX(centerX, zoneCount);
    const current = zones[zone];
    if (!current || getShoulderWidth(landmarks) > getShoulderWidth(current)) {
      zones[zone] = landmarks;
    }
  }

  return zones;
}
