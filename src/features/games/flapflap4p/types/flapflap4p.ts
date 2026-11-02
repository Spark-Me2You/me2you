/**
 * FlapFlap 4P Game Types
 */

/** P1..P4 are the camera strips from left to right on the (mirrored) screen. */
export type PlayerId = "P1" | "P2" | "P3" | "P4";

export type FlapFlap4PState = "WAITING" | "COUNTDOWN" | "PLAYING" | "GAME_OVER";

/** Last bird standing, or DRAW if the last surviving birds crashed on the same step. */
export type FlapFlap4PResult = PlayerId | "DRAW";
