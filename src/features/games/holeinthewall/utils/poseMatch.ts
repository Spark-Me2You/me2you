/**
 * Joint-angle pose matching.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { HOLE_IN_THE_WALL_CONFIG } from "../config/holeInTheWallConfig";
import type { PoseDefinition, PoseMatch } from "../types/holeInTheWall";

/**
 * Angle in degrees (0..180) at `vertex` between rays to `a` and `c`.
 * x is scaled by `aspect` so angles aren't distorted by the non-square
 * normalized coordinate space.
 */
export function jointAngle(
  a: NormalizedLandmark,
  vertex: NormalizedLandmark,
  c: NormalizedLandmark,
  aspect: number = HOLE_IN_THE_WALL_CONFIG.CAMERA_ASPECT,
): number {
  const v1x = (a.x - vertex.x) * aspect;
  const v1y = a.y - vertex.y;
  const v2x = (c.x - vertex.x) * aspect;
  const v2y = c.y - vertex.y;
  const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (mag === 0) return 0;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

const isVisible = (
  lm: NormalizedLandmark | undefined,
): lm is NormalizedLandmark =>
  !!lm && (lm.visibility ?? 1) >= HOLE_IN_THE_WALL_CONFIG.MIN_LANDMARK_VISIBILITY;

export function matchPose(
  landmarks: NormalizedLandmark[] | null,
  pose: PoseDefinition,
  aspect: number = HOLE_IN_THE_WALL_CONFIG.CAMERA_ASPECT,
): PoseMatch {
  if (!landmarks) {
    return {
      matched: false,
      score: 0,
      failing: pose.joints.map((j) => j.name),
    };
  }

  const failing: string[] = [];
  let scoreSum = 0;

  for (const joint of pose.joints) {
    const a = landmarks[joint.a];
    const vertex = landmarks[joint.vertex];
    const c = landmarks[joint.c];
    if (!isVisible(a) || !isVisible(vertex) || !isVisible(c)) {
      failing.push(joint.name);
      continue;
    }
    const error = Math.abs(jointAngle(a, vertex, c, aspect) - joint.angle);
    if (error > joint.tolerance) failing.push(joint.name);
    // 1 at a perfect angle, 0 at twice the tolerance
    scoreSum += Math.max(0, 1 - error / (joint.tolerance * 2));
  }

  return {
    matched: failing.length === 0,
    score: scoreSum / pose.joints.length,
    failing,
  };
}
