import { beforeEach, describe, expect, it } from "vitest";
import {
  ACQUIRE_FRAMES,
  THUMB_PRESS_RATIO,
  THUMB_RELEASE_RATIO,
  ThumbClickDetector,
  isPointingPose,
  thumbClosureRatio,
  type Point3,
} from "./handGesture";

const PALM = 0.09;

/**
 * Upright pointing hand (wrist at origin, fingers toward -y) with the thumb
 * tip `thumbRatio` palm-lengths to the side of the index knuckle.
 */
function pointingHand(thumbRatio = 0.8): Point3[] {
  const p = (x: number, y: number): Point3 => ({ x, y, z: 0 });
  const lm: Point3[] = Array.from({ length: 21 }, () => p(0, 0));
  lm[5] = p(-0.02, -PALM); // index MCP
  lm[6] = p(-0.02, -0.13); // index PIP
  lm[8] = p(-0.02, -0.17); // index tip, extended
  lm[9] = p(0, -PALM); // middle MCP
  lm[10] = p(0, -0.12);
  lm[12] = p(0, -0.07); // curled back toward the palm
  lm[14] = p(0.02, -0.11);
  lm[16] = p(0.02, -0.065);
  lm[18] = p(0.04, -0.1);
  lm[20] = p(0.04, -0.06);
  lm[4] = p(-0.02 - thumbRatio * PALM, -PALM);
  return lm;
}

function transform(lm: Point3[], fn: (pt: Point3) => Point3): Point3[] {
  return lm.map(fn);
}

describe("isPointingPose", () => {
  it("accepts an upright pointing hand", () => {
    expect(isPointingPose(pointingHand())).toBe(true);
  });

  it("still accepts the pose when the hand is tilted sideways", () => {
    // 90° rotation: finger points along +x, where a screen-y check fails.
    const rotated = transform(pointingHand(), ({ x, y, z }) => ({ x: -y, y: x, z }));
    expect(isPointingPose(rotated)).toBe(true);
  });

  it("rejects an open hand", () => {
    const lm = pointingHand();
    lm[12] = { x: 0, y: -0.18, z: 0 };
    expect(isPointingPose(lm)).toBe(false);
  });

  it("rejects a fist", () => {
    const lm = pointingHand();
    lm[8] = { x: -0.02, y: -0.08, z: 0 };
    expect(isPointingPose(lm)).toBe(false);
  });
});

describe("thumbClosureRatio", () => {
  it("is measured in palm lengths", () => {
    expect(thumbClosureRatio(pointingHand(0.5))).toBeCloseTo(0.5);
  });

  it("does not change with hand size or distance", () => {
    const scaled = transform(pointingHand(0.25), ({ x, y, z }) => ({ x: x * 2.5, y: y * 2.5, z: z * 2.5 }));
    expect(thumbClosureRatio(scaled)).toBeCloseTo(0.25);
  });
});

describe("ThumbClickDetector", () => {
  const OPEN = THUMB_RELEASE_RATIO + 0.2;
  const CLOSED = THUMB_PRESS_RATIO - 0.1;
  const BETWEEN = (THUMB_PRESS_RATIO + THUMB_RELEASE_RATIO) / 2;
  let d: ThumbClickDetector;

  const feed = (ratio: number, frames: number) =>
    Array.from({ length: frames }, () => d.update(ratio)).filter(Boolean).length;

  beforeEach(() => {
    d = new ThumbClickDetector();
  });

  it("fires one click per press after acquisition and debounce", () => {
    feed(OPEN, ACQUIRE_FRAMES);
    expect(d.update(CLOSED)).toBe(false); // debounce frame
    expect(d.update(CLOSED)).toBe(true);
    expect(d.pinched).toBe(true);
    expect(feed(CLOSED, 10)).toBe(0); // holding doesn't repeat
  });

  it("ignores a single noisy frame below the press threshold", () => {
    feed(OPEN, ACQUIRE_FRAMES);
    expect(feed(CLOSED, 1) + feed(OPEN, 1)).toBe(0);
    expect(d.pinched).toBe(false);
  });

  it("needs the thumb to open past release before clicking again", () => {
    feed(OPEN, ACQUIRE_FRAMES);
    expect(feed(CLOSED, 2)).toBe(1);
    // Jitter inside the hysteresis band must not re-arm.
    expect(feed(BETWEEN, 3) + feed(CLOSED, 3)).toBe(0);
    feed(OPEN, 1);
    expect(feed(CLOSED, 2)).toBe(1);
  });

  it("doesn't click for a hand that arrives with the thumb already curled", () => {
    expect(feed(CLOSED, ACQUIRE_FRAMES + 10)).toBe(0);
    expect(d.pinched).toBe(true);
    feed(OPEN, 1);
    expect(feed(CLOSED, 2)).toBe(1);
  });

  it("can't click during acquisition", () => {
    expect(feed(OPEN, 1) + feed(CLOSED, ACQUIRE_FRAMES - 1)).toBe(0);
  });

  it("starts acquisition over after reset", () => {
    feed(OPEN, ACQUIRE_FRAMES);
    d.reset();
    expect(feed(CLOSED, ACQUIRE_FRAMES)).toBe(0);
  });
});
