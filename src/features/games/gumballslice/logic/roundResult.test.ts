import { describe, expect, it } from "vitest";
import { buildRoundResult, computeAccuracy, qualifies } from "./roundResult";

describe("qualifies", () => {
  it("requires a full round AND the minimum slices", () => {
    expect(qualifies(true, 25, 25)).toBe(true);
    expect(qualifies(true, 40, 25)).toBe(true);
    expect(qualifies(true, 24, 25)).toBe(false);
    expect(qualifies(false, 40, 25)).toBe(false);
  });
});

describe("computeAccuracy", () => {
  it("is sliced / (sliced + missed)", () => {
    expect(computeAccuracy(3, 1)).toBeCloseTo(0.75);
    expect(computeAccuracy(5, 0)).toBe(1);
  });

  it("is 0 when no candy was resolved", () => {
    expect(computeAccuracy(0, 0)).toBe(0);
  });
});

describe("buildRoundResult", () => {
  it("fills every field the reward seam expects", () => {
    const result = buildRoundResult(
      { score: 420, slicedCount: 30, missedCount: 10, bestCombo: 4, durationMs: 60000 },
      "session-1",
      true,
      25,
    );
    expect(result).toEqual({
      playerSession: "session-1",
      score: 420,
      slicedCount: 30,
      accuracy: 0.75,
      bestCombo: 4,
      fullRound: true,
      qualifies: true,
      durationMs: 60000,
    });
  });
});
