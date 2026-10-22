/**
 * Round result rules
 */

import type { RoundResult, RoundStats } from "../types/gumballSlice";

/** Share of good candies that were sliced rather than dropped (0..1). */
export function computeAccuracy(slicedCount: number, missedCount: number): number {
  const resolved = slicedCount + missedCount;
  return resolved > 0 ? slicedCount / resolved : 0;
}

export interface WinRule {
  minSlices: number;
  maxBroccoliHits: number;
}

/**
 * A run wins candy only if the whole round was played, the candy goal was met
 * AND the player stayed within the broccoli limit.
 */
export function qualifies(
  fullRound: boolean,
  slicedCount: number,
  broccoliHits: number,
  rule: WinRule,
): boolean {
  return fullRound && slicedCount >= rule.minSlices && broccoliHits <= rule.maxBroccoliHits;
}

export function buildRoundResult(
  stats: RoundStats,
  playerSession: string,
  fullRound: boolean,
  rule: WinRule,
): RoundResult {
  return {
    playerSession,
    score: stats.score,
    slicedCount: stats.slicedCount,
    accuracy: computeAccuracy(stats.slicedCount, stats.missedCount),
    broccoliHits: stats.broccoliHits,
    bestCombo: stats.bestCombo,
    fullRound,
    qualifies: qualifies(fullRound, stats.slicedCount, stats.broccoliHits, rule),
    durationMs: stats.durationMs,
  };
}
