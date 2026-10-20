import { describe, expect, it } from "vitest";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import { planArc } from "./trajectory";

const W = 1920;
const H = 1080;

describe("planArc", () => {
  it("always peaks inside the reach zone (no corner or edge outliers)", () => {
    for (let i = 0; i < 10_000; i++) {
      const arc = planArc(C, W, H);
      expect(arc.apexX).toBeGreaterThanOrEqual(W * C.REACH_X_MIN);
      expect(arc.apexX).toBeLessThanOrEqual(W * C.REACH_X_MAX);
      expect(arc.apexY).toBeGreaterThanOrEqual(H * C.REACH_Y_MIN);
      expect(arc.apexY).toBeLessThanOrEqual(H * C.REACH_Y_MAX);
    }
  });

  it("covers the extremes of the zone exactly", () => {
    const low = planArc(C, W, H, () => 0);
    const high = planArc(C, W, H, () => 0.999999);
    expect(low.apexX).toBeCloseTo(W * C.REACH_X_MIN);
    expect(low.apexY).toBeCloseTo(H * C.REACH_Y_MIN);
    expect(high.apexX).toBeCloseTo(W * C.REACH_X_MAX, 0);
    expect(high.apexY).toBeCloseTo(H * C.REACH_Y_MAX, 0);
  });

  it("keeps the whole flight on screen horizontally", () => {
    for (let i = 0; i < 10_000; i++) {
      const arc = planArc(C, W, H);
      // A parabola is symmetric: it lands as far past the peak as it started before it.
      const landX = 2 * arc.apexX - arc.launchX;
      for (const x of [arc.launchX, landX]) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(W);
      }
    }
  });

  it("rises straight up from a fixed point, clamped into the zone", () => {
    const arc = planArc(C, W, H, Math.random, W * 0.5);
    expect(arc.launchX).toBe(W * 0.5);
    expect(arc.apexX).toBe(W * 0.5);
    expect(planArc(C, W, H, Math.random, 0).apexX).toBe(W * C.REACH_X_MIN);
  });
});
