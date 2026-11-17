import { describe, expect, it } from "vitest";
import { MII_TOP_FIT } from "../config/clotheslineConfig";
import { getTopPlacement } from "./topPlacement";

describe("getTopPlacement", () => {
  const bodyW = 104;
  const bodyH = 80;

  it("limits a wide top by the torso width", () => {
    const placement = getTopPlacement(bodyW, bodyH, 3);
    expect(placement.width).toBeCloseTo(bodyW * MII_TOP_FIT.maxWidthFactor);
    expect(placement.height).toBeCloseTo(placement.width / 3);
  });

  it("limits a long top by the torso height", () => {
    const placement = getTopPlacement(bodyW, bodyH, 0.5);
    expect(placement.height).toBeCloseTo(bodyH * MII_TOP_FIT.maxHeightFactor);
    expect(placement.width).toBeCloseTo(placement.height * 0.5);
  });

  it("hangs the top from the shoulder line and keeps it above the feet", () => {
    const placement = getTopPlacement(bodyW, bodyH, 1);
    expect(placement.topAboveFeet).toBeCloseTo(bodyH * (1 - MII_TOP_FIT.shoulderYFactor));
    expect(placement.topAboveFeet - placement.height).toBeGreaterThan(0);
  });

  it("falls back to a square for a broken aspect ratio", () => {
    const placement = getTopPlacement(bodyW, bodyH, Number.NaN);
    expect(placement.width).toBe(placement.height);
  });
});
