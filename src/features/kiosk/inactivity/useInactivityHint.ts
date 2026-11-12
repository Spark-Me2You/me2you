/**
 * Drives the idle-screen inactivity hint: polls face presence and CV cursor activity
 * and returns whether the hint should be playing. See inactivityTracker.ts for rules.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useCvCursorEnabled } from "@/core/cv/cursor/CvCursorEnabledContext";
import { useFacePresence } from "./useFacePresence";
import { DEFAULT_INACTIVITY_CONFIG, INITIAL_INACTIVITY_STATE, stepInactivity } from "./inactivityTracker";
import type { InactivityConfig } from "./inactivityTracker";

const POLL_MS = 250;

export function useInactivityHint(
  enabled: boolean,
  config: InactivityConfig = DEFAULT_INACTIVITY_CONFIG,
): { hinting: boolean; endHint: () => void } {
  const { cursorStateRef } = useCvCursorEnabled();
  const lastFaceAtRef = useFacePresence(enabled);
  const [hinting, setHinting] = useState(false);
  const hintingRef = useRef(false);
  const stateRef = useRef(INITIAL_INACTIVITY_STATE);

  const setHint = useCallback((on: boolean) => {
    hintingRef.current = on;
    setHinting(on);
  }, []);

  const endHint = useCallback(() => setHint(false), [setHint]);

  useEffect(() => {
    stateRef.current = INITIAL_INACTIVITY_STATE;
    if (!enabled) return;

    const id = setInterval(() => {
      const cursor = cursorStateRef.current;
      const { state, action } = stepInactivity(
        stateRef.current,
        {
          now: performance.now(),
          lastFaceAt: lastFaceAtRef.current,
          active: cursor.visible || cursor.isPinched,
          hinting: hintingRef.current,
        },
        config,
      );
      stateRef.current = state;
      if (action === "start-hint") setHint(true);
      else if (action === "cancel-hint") setHint(false);
    }, POLL_MS);

    // Disabling (or unmounting) stops any hint mid-swipe.
    return () => {
      clearInterval(id);
      setHint(false);
    };
  }, [enabled, config, cursorStateRef, lastFaceAtRef, setHint]);

  return { hinting, endHint };
}
