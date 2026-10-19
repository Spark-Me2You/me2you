import { describe, expect, it } from "vitest";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import { isSuspenseWave, pickItemKind, pickSuspenseKind, planWave } from "./waves";

describe("planWave", () => {
  it("grows but never exceeds the max wave size", () => {
    expect(planWave(0, C).count).toBe(C.FIRST_WAVE_SIZE);
    expect(planWave(100, C).count).toBe(C.MAX_WAVE_SIZE);
    expect(planWave(100, C).nextInSec).toBe(C.MIN_WAVE_INTERVAL_SEC);
  });
});

describe("pickItemKind", () => {
  it("only ever picks broccoli as the bad item", () => {
    expect(pickItemKind(3, C, () => 0)).toBe("broccoli");
  });

  it("never sends a bad item in the first wave", () => {
    expect(pickItemKind(0, C, () => 0)).not.toBe("broccoli");
  });
});

describe("suspense beats", () => {
  it("happen every Nth wave, never the first", () => {
    expect(isSuspenseWave(0, C)).toBe(false);
    expect(isSuspenseWave(C.SUSPENSE_EVERY_WAVES, C)).toBe(true);
    expect(isSuspenseWave(C.SUSPENSE_EVERY_WAVES + 1, C)).toBe(false);
  });

  it("reveal golden, broccoli or candy by roll", () => {
    expect(pickSuspenseKind(C, () => 0)).toBe("golden");
    expect(pickSuspenseKind(C, () => C.SUSPENSE_GOLDEN_CHANCE + 0.01)).toBe("broccoli");
    expect(pickSuspenseKind(C, () => 0.99)).not.toMatch(/golden|broccoli/);
  });
});
