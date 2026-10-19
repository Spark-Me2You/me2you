/**
 * Round result rules
 */

import type { RoundResult, RoundStats } from "../types/gumballSlice";

/** Share of good candies that were sliced rather than dropped (0..1). */
export function computeAccuracy(slicedCount: number, missedCount: number): number {
  const resolved = slicedCount + missedCount;
  return resolved > 0 ? slicedCount / resolved : 0;
}

/** A run qualifies only if the whole round was played AND the candy goal was met. */
export function qualifies(fullRound: boolean, slicedCount: number, minSlices: number): boolean {
  return fullRound && slicedCount >= minSlices;
}

export function buildRoundResult(
  stats: RoundStats,
  playerSession: string,
  fullRound: boolean,
  minSlices: number,
): RoundResult {
  return {
    playerSession,
    score: stats.score,
    slicedCount: stats.slicedCount,
    accuracy: computeAccuracy(stats.slicedCount, stats.missedCount),
    bestCombo: stats.bestCombo,
    fullRound,
    qualifies: qualifies(fullRound, stats.slicedCount, minSlices),
    durationMs: stats.durationMs,
  };
}
