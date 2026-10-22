/**
 * Gumball Slice Types
 */

export type ScreenState = "START" | "COUNTDOWN" | "PLAYING" | "RESULTS" | "LOST";

export type ItemKind = "candy" | "golden" | "broccoli";

export type RoundEndReason = "TIME_UP" | "STRUCK_OUT" | "PLAYER_LOST";

/** Live values shown in the HUD; pushed by the engine only when they change. */
export interface HudSnapshot {
  score: number;
  secondsLeft: number;
  slicedCount: number;
  broccoliHits: number;
  comboCount: number;
  playerMissing: boolean;
}

/** Raw stats the engine collects over a round. */
export interface RoundStats {
  score: number;
  slicedCount: number;
  missedCount: number;
  broccoliHits: number;
  bestCombo: number;
  durationMs: number;
}

/** What a finished round hands to the reward seam (onRoundComplete). */
export interface RoundResult {
  playerSession: string;
  score: number;
  slicedCount: number;
  accuracy: number; // 0..1
  broccoliHits: number;
  bestCombo: number;
  fullRound: boolean;
  qualifies: boolean;
  durationMs: number;
}
