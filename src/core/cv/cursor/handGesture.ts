/**
 * Hand gesture math for the CV cursor.
 * Pure functions over MediaPipe hand landmarks so they can be unit tested
 * without a camera. Works on world landmarks (metric, hand-centred 3D), which
 * are independent of camera distance, frame aspect ratio and hand rotation.
 */

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

// Landmark indices (https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

// Thumb-tip → index-knuckle distance as a fraction of palm length (wrist → middle knuckle).
// Below PRESS the thumb counts as curled in; it must open past RELEASE before the next click.
// The gap between them is the hysteresis band that stops a jittery thumb double-clicking.
export const THUMB_PRESS_RATIO = 0.3;
export const THUMB_RELEASE_RATIO = 0.45;
// Consecutive frames the thumb must stay below PRESS before a click fires (~30fps).
export const PRESS_DEBOUNCE_FRAMES = 2;
// Frames a newly acquired hand must be tracked before it may click, so a hand
// entering the frame (or a one-frame false detection) can't fire a click.
export const ACQUIRE_FRAMES = 4;

function dist(a: Point3, b: Point3): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/**
 * Pointing pose: index finger extended, middle/ring/pinky curled.
 * A finger is extended when its tip is farther from the wrist than its PIP
 * joint, which holds at any hand rotation (unlike comparing screen y).
 */
export function isPointingPose(lm: Point3[]): boolean {
  const w = lm[WRIST];
  const extended = (tip: number, pip: number) => dist(w, lm[tip]) > dist(w, lm[pip]);
  return (
    extended(INDEX_TIP, INDEX_PIP) &&
    !extended(MIDDLE_TIP, MIDDLE_PIP) &&
    !extended(RING_TIP, RING_PIP) &&
    !extended(PINKY_TIP, PINKY_PIP)
  );
}

/** Thumb-tip → index-knuckle distance, normalised by palm length. */
export function thumbClosureRatio(lm: Point3[]): number {
  const palm = dist(lm[WRIST], lm[MIDDLE_MCP]);
  if (palm === 0) return Infinity;
  return dist(lm[THUMB_TIP], lm[INDEX_MCP]) / palm;
}

/**
 * Turns a per-frame thumb closure ratio into a held "pinched" state plus
 * one-shot click edges, with acquisition delay, debounce and hysteresis.
 */
export class ThumbClickDetector {
  private trackedFrames = 0;
  private belowPressFrames = 0;
  pinched = false;

  /** Feed one frame. Returns true on the frame a click should fire. */
  update(ratio: number): boolean {
    this.trackedFrames++;
    this.belowPressFrames = ratio < THUMB_PRESS_RATIO ? this.belowPressFrames + 1 : 0;

    // While acquiring, just mirror the thumb so a hand that arrives already
    // curled has to open before it can click.
    if (this.trackedFrames <= ACQUIRE_FRAMES) {
      this.pinched = ratio < THUMB_RELEASE_RATIO && (this.pinched || ratio < THUMB_PRESS_RATIO);
      return false;
    }

    if (this.pinched) {
      if (ratio > THUMB_RELEASE_RATIO) this.pinched = false;
      return false;
    }

    if (this.belowPressFrames >= PRESS_DEBOUNCE_FRAMES) {
      this.pinched = true;
      return true;
    }
    return false;
  }

  /** Call when the hand or pointing pose is lost. */
  reset(): void {
    this.trackedFrames = 0;
    this.belowPressFrames = 0;
    this.pinched = false;
  }
}
