import { describe, expect, it, vi } from "vitest";
import type { RoundResult } from "../types/gumballSlice";
import { CANDY_REWARD_CLAIM_TYPE, onRoundComplete } from "./roundCompleteService";

const result: RoundResult = {
  playerSession: "round-1",
  score: 340,
  slicedCount: 24,
  accuracy: 0.8,
  broccoliHits: 1,
  bestCombo: 4,
  fullRound: true,
  qualifies: true,
  durationMs: 60000,
};

describe("onRoundComplete", () => {
  vi.spyOn(console, "info").mockImplementation(() => {});

  it("gives a winning round a candy_reward claim tied to the round", () => {
    const { claimPayload } = onRoundComplete(result);
    expect(claimPayload?.type).toBe(CANDY_REWARD_CLAIM_TYPE);
    expect(claimPayload?.data).toMatchObject({
      game_id: "gumballslice",
      round_id: "round-1",
      score: 340,
      sliced_count: 24,
      broccoli_hits: 1,
      full_round: true,
    });
  });

  it("gives no claim to a round that didn't win", () => {
    expect(onRoundComplete({ ...result, qualifies: false }).claimPayload).toBeNull();
  });
});
