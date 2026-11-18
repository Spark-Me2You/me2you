/**
 * Sends the kiosk back to Home after 45s without interaction on any screen except Home.
 *
 * Activity is CV cursor use, any detected hand (games steered by the raw hand track),
 * or input a game reports via `markActivity()` (FlapFlap arm flaps). Activity during the
 * warning cancels it; once the wipe starts the return is committed.
 */

import { useCallback, useState } from "react";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { useInactivityPrompt } from "./useInactivityPrompt";
import { ReturnHomeOverlay } from "./ReturnHomeOverlay";
import type { InactivityConfig } from "./inactivityTracker";

const RETURN_HOME_CONFIG: InactivityConfig = {
  idleMs: 45_000,
  // Unused: presence isn't required for the return-home timer.
  presenceGraceMs: 0,
};

const RETURN_HOME_OPTIONS = { requireFace: false, countAnyHand: true };

export function ReturnHome() {
  const { currentState, transitionTo } = useAppState();
  const [leaving, setLeaving] = useState(false);
  const { prompting, endPrompt } = useInactivityPrompt(
    currentState !== AppState.IDLE && !leaving,
    RETURN_HOME_CONFIG,
    RETURN_HOME_OPTIONS,
  );

  const handleCommit = useCallback(() => setLeaving(true), []);
  const handleCovered = useCallback(() => transitionTo(AppState.IDLE), [transitionTo]);
  const handleDone = useCallback(() => {
    setLeaving(false);
    endPrompt();
  }, [endPrompt]);

  if (!prompting && !leaving) return null;
  return <ReturnHomeOverlay onCommit={handleCommit} onCovered={handleCovered} onDone={handleDone} />;
}
