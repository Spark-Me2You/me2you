/**
 * FlapFlap 2P Game Types
 */

/** P1 plays on the left half of the (mirrored) camera, P2 on the right. */
export type PlayerId = "P1" | "P2";

export type FlapFlap2PState = "WAITING" | "COUNTDOWN" | "PLAYING" | "GAME_OVER";

/** Winner of the round, or DRAW if both birds crashed on the same step. */
export type FlapFlap2PResult = PlayerId | "DRAW";
