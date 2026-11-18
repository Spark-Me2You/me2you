import { describe, expect, it } from "vitest";
import {
  CURSOR_HOLD_MS,
  IDLE_POSE,
  IDLE_TRACKER,
  nextCursorPose,
  palmCenter,
  pinchRatio,
  toScreen,
  trackCursorPose,
} from "./handGeometry";
import type { CursorPose } from "./handGeometry";
import type { NormalizedLandmark } from "./handLandmarkerLoader";

/** An upright hand: `size` is the palm length, and the thumb sits `gap` away from the index tip. */
function makeHand(size: number, gap: number, originX = 0.5, originY = 0.8): NormalizedLandmark[] {
  const hand: NormalizedLandmark[] = Array.from({ length: 21 }, () => ({
    x: originX,
    y: originY,
    z: 0,
    visibility: 1,
  }));
  hand[9] = { ...hand[9], y: originY - size };
  hand[8] = { ...hand[8], y: originY - size * 1.8 };
  hand[4] = { ...hand[4], x: originX + gap, y: originY - size * 1.8 };
  return hand;
}

type Point = [x: number, y: number];

/**
 * A realistic upright hand with a 0.2 palm, in the ready pose unless overridden: thumb and index
 * open like an L, other fingers curled so their tips sit nearer the wrist than their middle joints.
 */
function makePose(overrides: Record<number, Point> = {}): NormalizedLandmark[] {
  const points: Record<number, Point> = {
    0: [0.5, 0.8],
    4: [0.3, 0.6],
    5: [0.46, 0.6],
    6: [0.46, 0.5],
    8: [0.46, 0.4],
    9: [0.5, 0.6],
    10: [0.5, 0.52],
    12: [0.5, 0.62],
    13: [0.54, 0.6],
    14: [0.54, 0.52],
    16: [0.54, 0.62],
    17: [0.58, 0.6],
    18: [0.58, 0.52],
    20: [0.58, 0.62],
    ...overrides,
  };
  return Array.from({ length: 21 }, (_, index) => {
    const [x, y] = points[index] ?? [0.5, 0.7];
    return { x, y, z: 0, visibility: 1 };
  });
}

const READY = makePose();
/** Index bent and thumb closed in, partway to a pinch: neither ready nor pinched by itself. */
const CLOSING = makePose({ 4: [0.4, 0.56], 8: [0.46, 0.52] });
/** Half-curled rather than tightly closed, as visitors tend to hold them. */
const LOOSE_READY = makePose({ 12: [0.5, 0.48], 16: [0.54, 0.49], 20: [0.58, 0.5] });
const PINCH = makePose({ 4: [0.44, 0.47], 8: [0.45, 0.46] });
const FIST = makePose({ 4: [0.47, 0.62], 6: [0.46, 0.52], 8: [0.46, 0.62] });
const OPEN_HAND = makePose({ 12: [0.5, 0.38], 16: [0.54, 0.38], 20: [0.58, 0.4] });
const PEACE_SIGN = makePose({ 12: [0.5, 0.38] });
const THUMB_TUCKED = makePose({ 4: [0.46, 0.62] });

const ACTIVE: CursorPose = { active: true, pinched: false };
const PINCHED: CursorPose = { active: true, pinched: true };

describe("pinchRatio", () => {
  it("gives the same reading near and far from the camera", () => {
    const near = pinchRatio(makeHand(0.3, 0.06), 1);
    const far = pinchRatio(makeHand(0.1, 0.02), 1);
    expect(near).toBeCloseTo(far);
    expect(near).toBeCloseTo(0.2);
  });

  it("corrects horizontal distance for the camera's aspect ratio", () => {
    expect(pinchRatio(makeHand(0.2, 0.02), 16 / 9)).toBeCloseTo((0.02 * (16 / 9)) / 0.2);
  });

  it("reads as far apart for a degenerate hand with no palm length", () => {
    expect(pinchRatio(makeHand(0, 0), 1)).toBe(Infinity);
  });
});

describe("nextCursorPose", () => {
  it("shows the cursor on the ready pose", () => {
    expect(nextCursorPose(IDLE_POSE, READY, 1)).toEqual(ACTIVE);
  });

  it.each([
    ["an open hand", OPEN_HAND],
    ["a peace sign", PEACE_SIGN],
    ["a tucked thumb", THUMB_TUCKED],
    ["a fist", FIST],
  ])("does not show the cursor for %s", (_name, hand) => {
    expect(nextCursorPose(IDLE_POSE, hand, 1)).toEqual(IDLE_POSE);
  });

  it("cannot start a pinch without the ready pose first", () => {
    expect(nextCursorPose(IDLE_POSE, PINCH, 1)).toEqual(IDLE_POSE);
  });

  it("stays on through the whole motion from ready to pinch and back", () => {
    let pose = nextCursorPose(IDLE_POSE, READY, 1);
    pose = nextCursorPose(pose, CLOSING, 1);
    expect(pose).toEqual(ACTIVE);
    pose = nextCursorPose(pose, PINCH, 1);
    expect(pose).toEqual(PINCHED);
    pose = nextCursorPose(pose, CLOSING, 1);
    expect(pose).toEqual(PINCHED);
    pose = nextCursorPose(pose, READY, 1);
    expect(pose).toEqual(ACTIVE);
  });

  it("holds a pinch even if the other fingers open", () => {
    const pinchWithFingersOpen = makePose({
      4: [0.44, 0.47],
      8: [0.45, 0.46],
      12: [0.5, 0.38],
    });
    expect(nextCursorPose(PINCHED, pinchWithFingersOpen, 1)).toEqual(PINCHED);
  });

  it("accepts half-curled other fingers as the ready pose", () => {
    expect(nextCursorPose(IDLE_POSE, LOOSE_READY, 1)).toEqual(ACTIVE);
  });

  it.each([
    ["the thumb moves in first", THUMB_TUCKED],
    ["the index bends first", makePose({ 8: [0.46, 0.52] })],
  ])("stays on when %s, while thumb and index are still far apart", (_name, hand) => {
    expect(nextCursorPose(ACTIVE, hand, 1)).toEqual(ACTIVE);
  });

  it("pinches with the other fingers open, once the cursor is up", () => {
    const okSign = makePose({
      4: [0.44, 0.47],
      8: [0.45, 0.46],
      12: [0.5, 0.38],
      16: [0.54, 0.38],
      20: [0.58, 0.4],
    });
    expect(nextCursorPose(ACTIVE, okSign, 1)).toEqual(PINCHED);
  });

  it("does not click when the ready pose closes into a fist", () => {
    expect(nextCursorPose(ACTIVE, FIST, 1)).toEqual(IDLE_POSE);
  });

  it("hides when the hand opens from the ready pose", () => {
    expect(nextCursorPose(ACTIVE, OPEN_HAND, 1)).toEqual(IDLE_POSE);
  });
});

describe("trackCursorPose", () => {
  const start = trackCursorPose(IDLE_TRACKER, READY, 1, 1000);

  it("stays up when the hand drops out mid-motion, then pinches when it returns", () => {
    const dropped = trackCursorPose(start, null, 1, 1100);
    expect(dropped.pose).toEqual(ACTIVE);
    expect(trackCursorPose(dropped, PINCH, 1, 1200).pose).toEqual(PINCHED);
  });

  it("keeps a held pinch through a dropout", () => {
    const pinching = trackCursorPose(start, PINCH, 1, 1100);
    expect(trackCursorPose(pinching, null, 1, 1200).pose).toEqual(PINCHED);
  });

  it("hides once the hand has been gone longer than the hold", () => {
    const held = trackCursorPose(start, null, 1, 1000 + CURSOR_HOLD_MS);
    expect(held.pose).toEqual(ACTIVE);
    expect(trackCursorPose(held, null, 1, 1001 + CURSOR_HOLD_MS)).toEqual(IDLE_TRACKER);
  });

  it("rides out a brief pose failure, then hides if it continues", () => {
    const failed = trackCursorPose(start, OPEN_HAND, 1, 1100);
    expect(failed.pose).toEqual(ACTIVE);
    expect(trackCursorPose(failed, READY, 1, 1200).confirmedAt).toBe(1200);
    expect(trackCursorPose(failed, OPEN_HAND, 1, 1001 + CURSOR_HOLD_MS)).toEqual(IDLE_TRACKER);
  });

  it("does not show the cursor for a hand that never made the ready pose", () => {
    expect(trackCursorPose(IDLE_TRACKER, PINCH, 1, 1000)).toEqual(IDLE_TRACKER);
    expect(trackCursorPose(IDLE_TRACKER, null, 1, 1000)).toEqual(IDLE_TRACKER);
  });
});

describe("palmCenter", () => {
  it("does not move when the fingertips do", () => {
    const open = makeHand(0.2, 0.1);
    const pinching = makeHand(0.2, 0.01);
    pinching[8] = { ...pinching[8], y: 0.7 };
    expect(palmCenter(pinching)).toEqual(palmCenter(open));
  });

  it("averages the wrist and knuckles", () => {
    const center = palmCenter(makeHand(0.2, 0, 0.5, 0.8));
    expect(center.x).toBeCloseTo(0.5);
    expect(center.y).toBeCloseTo((0.8 * 4 + 0.6) / 5);
  });
});

describe("toScreen", () => {
  const range = { xMin: 0.2, xMax: 0.8, yMin: 0.2, yMax: 0.8 };
  const screen = { width: 1000, height: 500 };

  it("mirrors x for the front camera and maps the range to the full screen", () => {
    expect(toScreen({ x: 0.2, y: 0.2 }, range, screen)).toEqual({ x: 1000, y: 0 });
    expect(toScreen({ x: 0.8, y: 0.8 }, range, screen)).toEqual({ x: 0, y: 500 });
  });

  it("clamps points outside the range to the screen edge", () => {
    expect(toScreen({ x: 0, y: 1 }, range, screen)).toEqual({ x: 1000, y: 500 });
  });
});
