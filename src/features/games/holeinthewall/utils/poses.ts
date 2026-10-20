/**
 * Pose library. Each pose is a set of joint-angle targets, so matching is
 * independent of body size and distance from the camera.
 */

import { PoseLandmark as L } from "@/shared/utils/gestureConstants";
import type { PoseDefinition } from "../types/holeInTheWall";

/** Arms straight out to the sides. Legs are omitted so players needn't fit head-to-toe in frame. */
export const T_POSE: PoseDefinition = {
  id: "t-pose",
  label: "t-pose",
  joints: [
    { name: "left shoulder", a: L.LEFT_HIP, vertex: L.LEFT_SHOULDER, c: L.LEFT_ELBOW, angle: 90, tolerance: 25 },
    { name: "right shoulder", a: L.RIGHT_HIP, vertex: L.RIGHT_SHOULDER, c: L.RIGHT_ELBOW, angle: 90, tolerance: 25 },
    { name: "left elbow", a: L.LEFT_SHOULDER, vertex: L.LEFT_ELBOW, c: L.LEFT_WRIST, angle: 180, tolerance: 30 },
    { name: "right elbow", a: L.RIGHT_SHOULDER, vertex: L.RIGHT_ELBOW, c: L.RIGHT_WRIST, angle: 180, tolerance: 30 },
  ],
};

export const POSES: PoseDefinition[] = [T_POSE];
