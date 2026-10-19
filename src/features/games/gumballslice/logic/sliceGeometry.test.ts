import { describe, expect, it } from "vitest";
import { segmentHitsCircle, segmentSpeed } from "./sliceGeometry";

describe("segmentHitsCircle", () => {
  it("hits when the segment passes through the circle", () => {
    expect(segmentHitsCircle(0, 0, 100, 0, 50, 0, 10)).toBe(true);
  });

  it("misses when the segment passes outside the radius", () => {
    expect(segmentHitsCircle(0, 0, 100, 0, 50, 30, 10)).toBe(false);
  });

  it("counts a segment that just touches the edge", () => {
    expect(segmentHitsCircle(0, 0, 100, 0, 50, 10, 10)).toBe(true);
  });

  it("catches a fast swipe whose two samples both lie outside the candy (no tunnelling)", () => {
    // One frame the finger is far left of the candy, the next far right.
    const [ax, ay, bx, by] = [0, 300, 1200, 320];
    const [cx, cy, r] = [600, 310, 40];
    expect(Math.hypot(ax - cx, ay - cy)).toBeGreaterThan(r);
    expect(Math.hypot(bx - cx, by - cy)).toBeGreaterThan(r);
    expect(segmentHitsCircle(ax, ay, bx, by, cx, cy, r)).toBe(true);
  });

  it("catches a diagonal swipe across the candy", () => {
    expect(segmentHitsCircle(0, 0, 1000, 1000, 500, 520, 30)).toBe(true);
  });

  it("does not extend past the segment ends", () => {
    // Circle lies on the line but beyond B.
    expect(segmentHitsCircle(0, 0, 100, 0, 200, 0, 20)).toBe(false);
    // ...and before A.
    expect(segmentHitsCircle(100, 0, 200, 0, 0, 0, 20)).toBe(false);
  });

  it("treats a zero-length segment as a point", () => {
    expect(segmentHitsCircle(50, 50, 50, 50, 55, 50, 10)).toBe(true);
    expect(segmentHitsCircle(50, 50, 50, 50, 80, 50, 10)).toBe(false);
  });
});

describe("segmentSpeed", () => {
  it("returns screen heights per second", () => {
    // 540px in 100ms on a 1080px screen = 5 screen heights / s
    expect(segmentSpeed(0, 0, 540, 0, 100, 1080)).toBeCloseTo(5);
  });

  it("is tiny for a resting, jittering finger", () => {
    // 3px of jitter between 33ms samples on 1080p
    expect(segmentSpeed(500, 500, 502, 502, 33, 1080)).toBeLessThan(0.2);
  });

  it("returns 0 for a non-positive time step", () => {
    expect(segmentSpeed(0, 0, 100, 0, 0, 1080)).toBe(0);
  });
});
