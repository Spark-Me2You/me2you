import { describe, expect, it } from "vitest";
import { buildRoundResult, computeAccuracy, qualifies } from "./roundResult";

const rule = { minSlices: 20, maxBroccoliHits: 0 };

describe("qualifies", () => {
  it("wins with a full round, the candy goal met and no broccoli", () => {
    expect(qualifies(true, 20, 0, rule)).toBe(true);
    expect(qualifies(true, 40, 0, rule)).toBe(true);
  });

  it("loses if the candy goal is missed", () => {
    expect(qualifies(true, 19, 0, rule)).toBe(false);
  });

  it("loses if any broccoli was sliced", () => {
    expect(qualifies(true, 40, 1, rule)).toBe(false);
  });

  it("loses if the round wasn't played in full", () => {
    expect(qualifies(false, 40, 0, rule)).toBe(false);
  });

  it("allows broccoli up to a configured limit", () => {
    const lenient = { minSlices: 20, maxBroccoliHits: 2 };
    expect(qualifies(true, 20, 2, lenient)).toBe(true);
    expect(qualifies(true, 20, 3, lenient)).toBe(false);
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
      { score: 420, slicedCount: 30, missedCount: 10, broccoliHits: 0, bestCombo: 4, durationMs: 60000 },
      "session-1",
      true,
      rule,
    );
    expect(result).toEqual({
      playerSession: "session-1",
      score: 420,
      slicedCount: 30,
      accuracy: 0.75,
      broccoliHits: 0,
      bestCombo: 4,
      fullRound: true,
      qualifies: true,
      durationMs: 60000,
    });
  });
});
