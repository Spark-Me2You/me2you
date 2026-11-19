import { describe, expect, it } from "vitest";
import { ROPE_END_MARGIN, clampX, defaultSpot, ropeCount, spotAt } from "./lineLayout";

describe("ropeCount", () => {
  it("always shows at least one rope", () => {
    expect(ropeCount(0, 8)).toBe(1);
    expect(ropeCount(8, 8)).toBe(1);
    expect(ropeCount(9, 8)).toBe(2);
  });
});

describe("defaultSpot", () => {
  it("spaces a full rope evenly", () => {
    expect(defaultSpot(0, 16, 8)).toEqual({ rope: 0, x: 0.5 / 8 });
    expect(defaultSpot(7, 16, 8)).toEqual({ rope: 0, x: 7.5 / 8 });
  });

  it("spaces a part-filled last rope by its own count", () => {
    expect(defaultSpot(8, 10, 8)).toEqual({ rope: 1, x: 0.25 });
    expect(defaultSpot(9, 10, 8)).toEqual({ rope: 1, x: 0.75 });
  });
});

describe("clampX", () => {
  it("keeps garments off the rope ends", () => {
    expect(clampX(-1)).toBe(ROPE_END_MARGIN);
    expect(clampX(2)).toBe(1 - ROPE_END_MARGIN);
    expect(clampX(0.3)).toBe(0.3);
  });
});

describe("spotAt", () => {
  const ropes = [
    { left: 100, top: 0, width: 1000, height: 200 },
    { left: 100, top: 220, width: 1000, height: 200 },
  ];

  it("picks the vertically nearest rope and the share along it", () => {
    expect(spotAt(600, 50, ropes)).toEqual({ rope: 0, x: 0.5 });
    expect(spotAt(350, 400, ropes)).toEqual({ rope: 1, x: 0.25 });
  });

  it("clamps past the rope ends", () => {
    expect(spotAt(0, 50, ropes)?.x).toBe(ROPE_END_MARGIN);
  });

  it("returns null with no ropes laid out", () => {
    expect(spotAt(0, 0, [])).toBeNull();
  });
});
