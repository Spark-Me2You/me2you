/**
 * Pose library. Each pose is a set of joint-angle targets, so matching is
 * independent of body size and distance from the camera.
 */

import { PoseLandmark as L } from "@/shared/utils/gestureConstants";
import type {
  JointTarget,
  PoseDefinition,
  PoseFigure,
} from "../types/holeInTheWall";

const ARM_TOLERANCE = 20;
const STRAIGHT_TOLERANCE = 30;
const LEG_TOLERANCE = 15;

/**
 * Builds a full-body pose (arms and legs) from its figure.
 *
 * - Shoulder: angle at the shoulder between hip and elbow.
 * - Elbow / knee: straight (180°).
 * - Leg spread: angle at each hip between the other hip and the ankle, which
 *   is 90° with feet together and grows as the leg swings outward.
 */
function buildPose(id: string, label: string, figure: PoseFigure): PoseDefinition {
  const joints: JointTarget[] = [
    { name: "left shoulder", a: L.LEFT_HIP, vertex: L.LEFT_SHOULDER, c: L.LEFT_ELBOW, angle: figure.leftArm, tolerance: ARM_TOLERANCE },
    { name: "right shoulder", a: L.RIGHT_HIP, vertex: L.RIGHT_SHOULDER, c: L.RIGHT_ELBOW, angle: figure.rightArm, tolerance: ARM_TOLERANCE },
    { name: "left elbow", a: L.LEFT_SHOULDER, vertex: L.LEFT_ELBOW, c: L.LEFT_WRIST, angle: 180, tolerance: STRAIGHT_TOLERANCE },
    { name: "right elbow", a: L.RIGHT_SHOULDER, vertex: L.RIGHT_ELBOW, c: L.RIGHT_WRIST, angle: 180, tolerance: STRAIGHT_TOLERANCE },
    { name: "left leg", a: L.RIGHT_HIP, vertex: L.LEFT_HIP, c: L.LEFT_ANKLE, angle: 90 + figure.legSpread, tolerance: LEG_TOLERANCE },
    { name: "right leg", a: L.LEFT_HIP, vertex: L.RIGHT_HIP, c: L.RIGHT_ANKLE, angle: 90 + figure.legSpread, tolerance: LEG_TOLERANCE },
    { name: "left knee", a: L.LEFT_HIP, vertex: L.LEFT_KNEE, c: L.LEFT_ANKLE, angle: 180, tolerance: STRAIGHT_TOLERANCE },
    { name: "right knee", a: L.RIGHT_HIP, vertex: L.RIGHT_KNEE, c: L.RIGHT_ANKLE, angle: 180, tolerance: STRAIGHT_TOLERANCE },
  ];
  return { id, label, figure, joints };
}

/** Arms straight out to the sides, feet together. */
export const T_POSE = buildPose("t-pose", "t-pose", {
  leftArm: 90,
  rightArm: 90,
  legSpread: 0,
});

/** Both arms straight up, feet together. */
export const HANDS_UP = buildPose("hands-up", "hands up", {
  leftArm: 165,
  rightArm: 165,
  legSpread: 0,
});

/** Arms up in a V, feet apart. */
export const STAR = buildPose("star", "star", {
  leftArm: 130,
  rightArm: 130,
  legSpread: 25,
});

/** Arms angled down and out, feet together. */
export const A_POSE = buildPose("a-pose", "a-pose", {
  leftArm: 45,
  rightArm: 45,
  legSpread: 0,
});

/** Left arm up, right arm out, feet together. Mirrored, so it reads as left-side-up on screen. */
export const ONE_ARM_UP = buildPose("one-arm-up", "one arm up", {
  leftArm: 165,
  rightArm: 90,
  legSpread: 0,
});

/** The first wall is always the T-pose; later walls draw from the rest. */
export const POSES: PoseDefinition[] = [
  T_POSE,
  HANDS_UP,
  STAR,
  A_POSE,
  ONE_ARM_UP,
];
