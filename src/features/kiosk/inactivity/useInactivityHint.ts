/**
 * Drives the idle-screen inactivity hint: the prompt plays once a screen-facing visitor
 * has gone `idleMs` without using the CV cursor. See useInactivityPrompt.ts.
 */

import { DEFAULT_INACTIVITY_CONFIG } from "./inactivityTracker";
import type { InactivityConfig } from "./inactivityTracker";
import { useInactivityPrompt } from "./useInactivityPrompt";

const HINT_OPTIONS = { requireFace: true, countAnyHand: false };

export function useInactivityHint(
  enabled: boolean,
  config: InactivityConfig = DEFAULT_INACTIVITY_CONFIG,
): { hinting: boolean; endHint: () => void } {
  const { prompting, endPrompt } = useInactivityPrompt(enabled, config, HINT_OPTIONS);
  return { hinting: prompting, endHint: endPrompt };
}
