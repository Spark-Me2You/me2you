/**
 * Kiosk activity — a shared "someone just did something" timestamp for the inactivity
 * prompts. Input the CV cursor can't see reports here: games call `markActivity()` (e.g.
 * FlapFlap on every arm flap), and real pointer / keyboard / touch input counts too, so a
 * mouse or touchscreen keeps the page alive during development.
 *
 * The timestamp lives in a ref, so marking activity from a RAF loop never re-renders.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

interface KioskActivityContextValue {
  /** performance.now() of the last reported activity, or null if none yet. */
  lastActivityAtRef: React.RefObject<number | null>;
  /** Record activity now. Cheap; safe to call every frame. */
  markActivity: () => void;
}

const KioskActivityContext = createContext<KioskActivityContextValue>({
  lastActivityAtRef: { current: null },
  markActivity: () => {},
});

const DOM_ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

export function KioskActivityProvider({ children }: { children: ReactNode }) {
  const lastActivityAtRef = useRef<number | null>(null);
  const markActivity = useCallback(() => {
    lastActivityAtRef.current = performance.now();
  }, []);

  useEffect(() => {
    // Only trusted events: the CV cursor dispatches synthetic pointer events, and its own
    // state is already read directly by the inactivity hook.
    const onEvent = (e: Event) => {
      if (e.isTrusted) markActivity();
    };
    for (const type of DOM_ACTIVITY_EVENTS) window.addEventListener(type, onEvent, { passive: true });
    return () => {
      for (const type of DOM_ACTIVITY_EVENTS) window.removeEventListener(type, onEvent);
    };
  }, [markActivity]);

  const value = useMemo(() => ({ lastActivityAtRef, markActivity }), [markActivity]);
  return <KioskActivityContext.Provider value={value}>{children}</KioskActivityContext.Provider>;
}

export function useKioskActivity(): KioskActivityContextValue {
  return useContext(KioskActivityContext);
}
