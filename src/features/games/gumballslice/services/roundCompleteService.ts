/**
 * Round Complete Service
 * The single hand-off point for a finished Gumball Slice round. Winning rounds
 * get a `candy_reward` claim payload, which the results screen turns into a
 * claim QR (same claim flow as FlapFlap's score claim).
 */

import type { ClaimPayload } from "@/features/claim";
import type { RoundOutcome, RoundResult } from "../types/gumballSlice";

export const CANDY_REWARD_CLAIM_TYPE = "candy_reward";

function buildCandyRewardPayload(result: RoundResult): ClaimPayload {
  return {
    version: "1.0",
    type: CANDY_REWARD_CLAIM_TYPE,
    display: {
      title: "You won candy!",
      description: `Gumball Slice: ${result.score} points, ${result.slicedCount} candies sliced.`,
      icon: "gift",
    },
    data: {
      game_id: "gumballslice",
      round_id: result.playerSession,
      score: result.score,
      sliced_count: result.slicedCount,
      broccoli_hits: result.broccoliHits,
      best_combo: result.bestCombo,
      accuracy: result.accuracy,
      duration_ms: result.durationMs,
      full_round: result.fullRound,
      played_at: new Date().toISOString(),
    },
  };
}

export function onRoundComplete(result: RoundResult): RoundOutcome {
  // TODO(rewards): vouchers + the daily cap are issued server-side by
  // claim-candy-reward and listed on the phone's "my candy" page; still to
  // come: the Google Sheet front-desk sync and redemption.
  console.info("[GumballSlice] round complete", result);
  return { result, claimPayload: result.qualifies ? buildCandyRewardPayload(result) : null };
}
