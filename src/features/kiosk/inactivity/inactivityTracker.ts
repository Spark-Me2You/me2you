/**
 * Inactivity tracker — pure logic behind the kiosk's inactivity prompts (the idle-screen
 * "use your hand" hint and the return-home warning on every other screen).
 *
 * While someone counts as present and isn't active, the idle clock runs; once it reaches
 * `idleMs` the prompt fires. The clock is paused while the prompt plays and restarts once
 * it ends, so an idle visitor sees it again every `idleMs`. Losing presence or becoming
 * active resets the clock and cancels a running prompt.
 *
 * What "present" and "active" mean is up to the caller (see useInactivityPrompt.ts): the
 * idle hint needs a screen-facing face, the return-home timer treats everyone as present.
 */

export interface InactivityConfig {
  /** Present-but-inactive time before the prompt plays. */
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
  /** Someone counts as present (see isPresent). */
  present: boolean;
  /** The visitor is interacting (CV cursor, hand, game input...). */
  active: boolean;
  /** The prompt is currently playing. */
  prompting: boolean;
}

export interface InactivityState {
  /** When the current idle stretch began, or null if the clock isn't running. */
  idleSince: number | null;
}

export type InactivityAction = "none" | "start-prompt" | "cancel-prompt";

export const INITIAL_INACTIVITY_STATE: InactivityState = { idleSince: null };

export function isPresent(now: number, lastFaceAt: number | null, presenceGraceMs: number): boolean {
  return lastFaceAt !== null && now - lastFaceAt <= presenceGraceMs;
}

export function stepInactivity(
  state: InactivityState,
  input: InactivityInput,
  config: InactivityConfig = DEFAULT_INACTIVITY_CONFIG,
): { state: InactivityState; action: InactivityAction } {
  const { now, present, active, prompting } = input;

  // Nobody watching, or they're interacting: reset and stop any prompt.
  if (!present || active) {
    return { state: { idleSince: null }, action: prompting ? "cancel-prompt" : "none" };
  }

  // The clock is paused while the prompt plays and restarts once it ends.
  if (prompting) return { state: { idleSince: null }, action: "none" };

  const idleSince = state.idleSince ?? now;
  if (now - idleSince >= config.idleMs) {
    return { state: { idleSince: null }, action: "start-prompt" };
  }
  return { state: { idleSince }, action: "none" };
}
