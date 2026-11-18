/**
 * Shared driver for the kiosk's inactivity prompts: polls presence and activity, steps
 * the tracker (inactivityTracker.ts) and returns whether the prompt should be playing.
 *
 * Activity is always: CV cursor up or pinching, or a recent `markActivity()` (games,
 * real pointer/keyboard input). `countAnyHand` also counts any freshly detected hand,
 * whatever its pose, which covers games steered by the raw hand track (Gumball Slice).
 * With `requireFace`, the clock only runs while a screen-facing face is seen.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useCvCursorEnabled } from "@/core/cv/cursor/CvCursorEnabledContext";
import { useFacePresence } from "./useFacePresence";
import { useKioskActivity } from "./KioskActivityContext";
import { INITIAL_INACTIVITY_STATE, isPresent, stepInactivity } from "./inactivityTracker";
import type { InactivityConfig } from "./inactivityTracker";

const POLL_MS = 250;
/** A hand sample or activity mark this recent counts as activity on a poll. */
const ACTIVITY_FRESH_MS = 1_000;

export interface InactivityPromptOptions {
  /** Only run the clock while a screen-facing face is seen. */
  requireFace: boolean;
  /** Count any detected hand as activity, not just the cursor's ready pose / pinch. */
  countAnyHand: boolean;
}

export function useInactivityPrompt(
  enabled: boolean,
  config: InactivityConfig,
  { requireFace, countAnyHand }: InactivityPromptOptions,
): { prompting: boolean; endPrompt: () => void } {
  const { cursorStateRef, handTrackRef } = useCvCursorEnabled();
  const { lastActivityAtRef } = useKioskActivity();
  const lastFaceAtRef = useFacePresence(enabled && requireFace);
  const [prompting, setPrompting] = useState(false);
  const promptingRef = useRef(false);
  const stateRef = useRef(INITIAL_INACTIVITY_STATE);

  const setPrompt = useCallback((on: boolean) => {
    promptingRef.current = on;
    setPrompting(on);
  }, []);

  const endPrompt = useCallback(() => setPrompt(false), [setPrompt]);

  useEffect(() => {
    stateRef.current = INITIAL_INACTIVITY_STATE;
    if (!enabled) return;

    const id = setInterval(() => {
      const now = performance.now();
      const cursor = cursorStateRef.current;
      const hand = handTrackRef.current;
      const lastActivityAt = lastActivityAtRef.current;
      const active =
        cursor.visible ||
        cursor.isPinched ||
        (lastActivityAt !== null && now - lastActivityAt <= ACTIVITY_FRESH_MS) ||
        (countAnyHand && hand.detected && now - hand.timestamp <= ACTIVITY_FRESH_MS);
      const present = requireFace ? isPresent(now, lastFaceAtRef.current, config.presenceGraceMs) : true;

      const { state, action } = stepInactivity(
        stateRef.current,
        { now, present, active, prompting: promptingRef.current },
        config,
      );
      stateRef.current = state;
      if (action === "start-prompt") setPrompt(true);
      else if (action === "cancel-prompt") setPrompt(false);
    }, POLL_MS);

    // Disabling (or unmounting) stops any prompt.
    return () => {
      clearInterval(id);
      setPrompt(false);
    };
  }, [
    enabled,
    config,
    requireFace,
    countAnyHand,
    cursorStateRef,
    handTrackRef,
    lastActivityAtRef,
    lastFaceAtRef,
    setPrompt,
  ]);

  return { prompting, endPrompt };
}
