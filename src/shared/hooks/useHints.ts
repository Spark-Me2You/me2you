import { useCallback, useEffect, useRef, useState } from "react";

/** A one-off instruction shown briefly to the person at the kiosk. */
export interface HintSpec {
  /** Stable key. Each id is shown at most once per mount of the hook. */
  id: string;
  text: string;
  /** How long the hint stays fully visible, in ms. */
  durationMs?: number;
}

export interface ActiveHint {
  id: string;
  text: string;
  /** True during the fade-out before the hint is removed. */
  leaving: boolean;
}

export const DEFAULT_HINT_DURATION_MS = 3500;
export const HINT_FADE_OUT_MS = 700;

/**
 * Shows short, self-dismissing hints, each at most once while the
 * consuming screen stays mounted. A new hint replaces the current one.
 */
export function useHints() {
  const [hint, setHint] = useState<ActiveHint | null>(null);
  const shownRef = useRef(new Set<string>());
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);

  const showHint = useCallback(
    ({ id, text, durationMs = DEFAULT_HINT_DURATION_MS }: HintSpec) => {
      if (shownRef.current.has(id)) return;
      shownRef.current.add(id);

      clearTimers();
      setHint({ id, text, leaving: false });
      timersRef.current.push(
        window.setTimeout(() => {
          setHint((h) => (h?.id === id ? { ...h, leaving: true } : h));
        }, durationMs),
        window.setTimeout(() => {
          setHint((h) => (h?.id === id ? null : h));
        }, durationMs + HINT_FADE_OUT_MS),
      );
    },
    [clearTimers],
  );

  const dismissHint = useCallback(() => {
    clearTimers();
    setHint(null);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return { hint, showHint, dismissHint };
}
