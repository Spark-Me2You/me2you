/**
 * Hand geometry for the CV cursor: where the hand is and whether it is pinching.
 * Pure functions: no MediaPipe runtime or React, so they are unit-tested directly.
 */

import type { NormalizedLandmark } from "./handLandmarkerLoader";

export interface HandRange {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
/** The wrist and the four knuckles barely move when the fingers do. */
const PALM_LANDMARKS = [WRIST, INDEX_MCP, MIDDLE_MCP, 13, 17];
/** Middle, ring and pinky. */
const OTHER_FINGERS = [
  { pip: 10, tip: 12 },
  { pip: 14, tip: 16 },
  { pip: 18, tip: 20 },
];

/**
 * Pinch thresholds, as thumb-to-index distance over palm length, so they hold at any distance
 * from the camera. Releasing takes a wider gap than pressing, so a held pinch doesn't flicker.
 */
const PINCH_PRESS_RATIO = 0.3;
const PINCH_RELEASE_RATIO = 0.45;
/** Below this, thumb and index count as closing towards a pinch, whatever the other fingers do. */
const PINCH_APPROACH_RATIO = 0.7;
/** To bring the cursor up, thumb and index must be this far apart, so a pinch can't pass as ready. */
const READY_GAP_RATIO = 0.5;
/** To bring the cursor up, the thumb tip must be this far from the index knuckle. */
const THUMB_OPEN_RATIO = 0.4;
/**
 * A finger counts as closed unless its tip is this much further from the wrist than its middle
 * joint. A straight finger reads about 1.4, so half-curled fingers still count as closed.
 */
const FINGER_CLOSED_RATIO = 1.15;

/** How long (ms) the cursor stays up after losing the hand or the pose, to ride out dropouts. */
export const CURSOR_HOLD_MS = 400;

export interface CursorPose {
  /** The cursor is showing: the hand made the ready pose and hasn't clearly left it. */
  active: boolean;
  pinched: boolean;
}

export const IDLE_POSE: CursorPose = { active: false, pinched: false };

export interface CursorPoseTracker {
  pose: CursorPose;
  /** When the hand last confirmed `pose`, for timing CURSOR_HOLD_MS. */
  confirmedAt: number;
}

export const IDLE_TRACKER: CursorPoseTracker = { pose: IDLE_POSE, confirmedAt: 0 };

export function palmCenter(landmarks: NormalizedLandmark[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const index of PALM_LANDMARKS) {
    x += landmarks[index].x;
    y += landmarks[index].y;
  }
  return { x: x / PALM_LANDMARKS.length, y: y / PALM_LANDMARKS.length };
}

/** Landmarks are normalized per axis, so `aspect` (width / height) restores true proportions. */
function distance(a: NormalizedLandmark, b: NormalizedLandmark, aspect: number): number {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}

/** Thumb-to-index distance relative to palm length. Smaller means a tighter pinch. */
export function pinchRatio(landmarks: NormalizedLandmark[], aspect: number): number {
  const palmLength = distance(landmarks[WRIST], landmarks[MIDDLE_MCP], aspect);
  if (palmLength === 0) return Infinity;
  return distance(landmarks[THUMB_TIP], landmarks[INDEX_TIP], aspect) / palmLength;
}

/**
 * Tracks the cursor's pose from frame to frame. It is easy to keep and harder to bring up, as
 * a pinch bends the index and closes the thumb, which breaks the ready pose on the way there.
 *
 * - Brought up by the ready pose: thumb and index open, other fingers closed or half-closed.
 * - Kept until the hand clearly does something else: opens flat, or closes into a fist.
 * - A pinch can only start while the cursor is up. Once held, only the fingers separating ends it.
 */
export function nextCursorPose(
  prev: CursorPose,
  landmarks: NormalizedLandmark[],
  aspect: number,
): CursorPose {
  const wristDistance = (index: number) => distance(landmarks[index], landmarks[WRIST], aspect);

  const ratio = pinchRatio(landmarks, aspect);
  if (prev.pinched && ratio < PINCH_RELEASE_RATIO) return { active: true, pinched: true };

  const othersClosed = OTHER_FINGERS.every(
    ({ pip, tip }) => wristDistance(tip) <= FINGER_CLOSED_RATIO * wristDistance(pip),
  );

  if (prev.active) {
    const isFist = wristDistance(INDEX_TIP) <= wristDistance(INDEX_MCP);
    if (!isFist && (othersClosed || ratio < PINCH_APPROACH_RATIO)) {
      return { active: true, pinched: ratio < PINCH_PRESS_RATIO };
    }
  }

  const palmLength = distance(landmarks[WRIST], landmarks[MIDDLE_MCP], aspect);
  const thumbOpen =
    distance(landmarks[THUMB_TIP], landmarks[INDEX_MCP], aspect) > THUMB_OPEN_RATIO * palmLength;
  const indexOpen = wristDistance(INDEX_TIP) > wristDistance(INDEX_PIP);
  const isReady = othersClosed && thumbOpen && indexOpen && ratio >= READY_GAP_RATIO;
  return { active: isReady, pinched: false };
}

/**
 * Advances the pose for one inference and rides out dropouts. `landmarks` is null when no hand
 * was detected. A held pinch survives a lost hand, so a tracking gap neither drops it nor clicks
 * again when the hand comes back.
 */
export function trackCursorPose(
  prev: CursorPoseTracker,
  landmarks: NormalizedLandmark[] | null,
  aspect: number,
  now: number,
): CursorPoseTracker {
  if (landmarks) {
    const pose = nextCursorPose(prev.pose, landmarks, aspect);
    if (pose.active) return { pose, confirmedAt: now };
  }
  if (!prev.pose.active || now - prev.confirmedAt > CURSOR_HOLD_MS) return IDLE_TRACKER;
  return { pose: { active: true, pinched: landmarks ? false : prev.pose.pinched }, confirmedAt: prev.confirmedAt };
}

/** Map a normalized camera point to screen px: mirrored for the front camera, range → full screen. */
export function toScreen(
  point: { x: number; y: number },
  range: HandRange,
  screen: { width: number; height: number },
): { x: number; y: number } {
  const normX = Math.min(1, Math.max(0, (point.x - range.xMin) / (range.xMax - range.xMin)));
  const normY = Math.min(1, Math.max(0, (point.y - range.yMin) / (range.yMax - range.yMin)));
  return { x: (1 - normX) * screen.width, y: normY * screen.height };
}
