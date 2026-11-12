/**
 * Inactivity tracker — pure logic behind the idle-screen "use your hand" hint.
 *
 * Someone counts as present while a screen-facing face was seen within the last
 * `presenceGraceMs` (so brief detector dropouts don't reset the clock). While they
 * are present and not using the CV cursor, the idle clock runs; once it reaches
 * `idleMs` the hint fires and the clock restarts after the hint finishes, so an
 * idle visitor sees it again every `idleMs`.
 */

export interface InactivityConfig {
  /** Present-but-inactive time before the hint plays. */
  idleMs: number;
  /** How long a person still counts as present after their face was last seen. */
  presenceGraceMs: number;
}

export const DEFAULT_INACTIVITY_CONFIG: InactivityConfig = {
  idleMs: 15_000,
  presenceGraceMs: 1_500,
};

export interface InactivityInput {
  /** performance.now() */
  now: number;
  /** Time a screen-facing face was last detected, or null if never. */
  lastFaceAt: number | null;
  /** The visitor is using the CV cursor (ready pose shown or pinching). */
  active: boolean;
  /** The hint animation is currently playing. */
  hinting: boolean;
}

export interface InactivityState {
  /** When the current idle stretch began, or null if the clock isn't running. */
  idleSince: number | null;
}

export type InactivityAction = "none" | "start-hint" | "cancel-hint";

export const INITIAL_INACTIVITY_STATE: InactivityState = { idleSince: null };

export function isPresent(now: number, lastFaceAt: number | null, presenceGraceMs: number): boolean {
  return lastFaceAt !== null && now - lastFaceAt <= presenceGraceMs;
}

export function stepInactivity(
  state: InactivityState,
  input: InactivityInput,
  config: InactivityConfig = DEFAULT_INACTIVITY_CONFIG,
): { state: InactivityState; action: InactivityAction } {
  const { now, lastFaceAt, active, hinting } = input;

  // Nobody watching, or they're already using the cursor: reset and stop any hint.
  if (!isPresent(now, lastFaceAt, config.presenceGraceMs) || active) {
    return { state: { idleSince: null }, action: hinting ? "cancel-hint" : "none" };
  }

  // The clock is paused while the hint plays and restarts once it ends.
  if (hinting) return { state: { idleSince: null }, action: "none" };

  const idleSince = state.idleSince ?? now;
  if (now - idleSince >= config.idleMs) {
    return { state: { idleSince: null }, action: "start-hint" };
  }
  return { state: { idleSince }, action: "none" };
}
