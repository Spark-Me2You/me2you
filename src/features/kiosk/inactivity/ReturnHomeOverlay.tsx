/**
 * Return-home warning: Ozzy peeks in from the left edge with a "hey, anyone there?"
 * bubble, counts down from 5, then a panel in the Home background gradient wipes left → right
 * across the screen.
 * Once it fully covers the screen the app switches to Home underneath, and the panel
 * carries on off the right edge to reveal it.
 *
 * Until the wipe starts the overlay ignores pointer events and the parent may unmount
 * it (activity cancels the return). `onCommit` marks the point of no return.
 */

import { useEffect, useRef, useState } from "react";
import otterImage from "@/assets/otter_default_rough_draft.png";

/** Phase timings (ms). The wipe durations must match the `return-wipe-*` animations in theme.css. */
export const RETURN_HOME_TIMELINE = {
  /** Ozzy + bubble on screen before the countdown starts. */
  greetMs: 1_500,
  countdownFrom: 5,
  countdownStepMs: 1_000,
  /** `--animate-return-wipe-in` */
  wipeInMs: 700,
  /** Fully covered, so Home can mount before it's revealed. */
  holdMs: 200,
  /** `--animate-return-wipe-out` */
  wipeOutMs: 700,
} as const;

type Phase = { kind: "greet" } | { kind: "count"; n: number } | { kind: "wipe-in" } | { kind: "wipe-out" };

interface ReturnHomeOverlayProps {
  /** The wipe started: the return can no longer be cancelled. */
  onCommit: () => void;
  /** The screen is fully covered: switch to Home now. */
  onCovered: () => void;
  /** The reveal finished: unmount the overlay. */
  onDone: () => void;
}

const T = RETURN_HOME_TIMELINE;

function nextPhase(phase: Phase): { next: Phase | null; after: number } {
  switch (phase.kind) {
    case "greet":
      return { next: { kind: "count", n: T.countdownFrom }, after: T.greetMs };
    case "count":
      return {
        next: phase.n > 1 ? { kind: "count", n: phase.n - 1 } : { kind: "wipe-in" },
        after: T.countdownStepMs,
      };
    case "wipe-in":
      return { next: { kind: "wipe-out" }, after: T.wipeInMs + T.holdMs };
    case "wipe-out":
      return { next: null, after: T.wipeOutMs };
  }
}

// Ozzy is drawn at his Home size (448px × the 0.7 scale of its panel ≈ 314px wide, 219px
// tall) and tilted clockwise so he leans in from the left edge head-first. The art is cut
// off flat at 72.7% of its height, and that edge (plus the paw drawn below it) must stay
// off-screen. 83° is the smallest tilt where it can while his whole head stays on screen;
// any less and pushing the cut off-screen hides the left side of his head. Centered at
// x=31, y=550 (left = 31 − 157, top = 550 − 110), the head reaches ≈113px in from the edge.
// The peek animation slides him in from −200px.
export function ReturnHomeOverlay({ onCommit, onCovered, onDone }: ReturnHomeOverlayProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "greet" });
  // Latest callbacks in a ref, so a parent re-render never restarts a phase timer.
  const callbacksRef = useRef({ onCommit, onCovered, onDone });
  useEffect(() => {
    callbacksRef.current = { onCommit, onCovered, onDone };
  });

  useEffect(() => {
    const { next, after } = nextPhase(phase);
    const id = setTimeout(() => {
      const cb = callbacksRef.current;
      if (next === null) {
        cb.onDone();
        return;
      }
      if (next.kind === "wipe-in") cb.onCommit();
      if (next.kind === "wipe-out") cb.onCovered();
      setPhase(next);
    }, after);
    return () => clearTimeout(id);
  }, [phase]);

  const wiping = phase.kind === "wipe-in" || phase.kind === "wipe-out";

  return (
    <div
      className={`fixed inset-0 z-[2000] overflow-hidden ${wiping ? "pointer-events-auto" : "pointer-events-none"}`}
      data-testid="return-home-overlay"
      data-phase={phase.kind}
      aria-live="polite"
    >
      {/* Ozzy + bubble: laid out on the 1920×1080 kiosk canvas, scaled to fit. */}
      {phase.kind !== "wipe-out" && (
        <div className="absolute top-0 left-0 h-[1080px] w-[1920px] origin-top-left [transform:scale(min(calc(100vw_/_1920),calc(100vh_/_1080)))]">
          <img
            src={otterImage}
            alt=""
            className="absolute top-[440px] left-[-126px] w-[314px] max-w-none rotate-83 animate-ozzy-peek select-none"
          />

          <div className="absolute top-[380px] left-[160px] flex min-w-[460px] animate-pop-in flex-col items-center rounded-glass bg-lime px-12 pt-8 pb-6 text-center shadow-glass-card [animation-delay:350ms] [animation-fill-mode:both]">
            {/* Tail pointing back at Ozzy */}
            <div className="absolute top-[150px] -left-4 size-10 rotate-45 bg-lime" />
            <p className="relative m-0 font-averia text-body-xl leading-[1.4] tracking-brand text-ink">
              hey, anyone there?
            </p>
            <span
              key={phase.kind === "count" ? phase.n : "none"}
              className={`relative block h-[96px] font-jersey text-[96px] leading-none tracking-brand text-magenta ${
                phase.kind === "count" ? "animate-pop" : "invisible"
              }`}
            >
              {phase.kind === "count" ? phase.n : T.countdownFrom}
            </span>
          </div>
        </div>
      )}

      {wiping && (
        <div
          className={`absolute inset-0 bg-page-gradient shadow-drop ${
            phase.kind === "wipe-in" ? "animate-return-wipe-in" : "animate-return-wipe-out"
          }`}
          data-testid="return-home-wipe"
        />
      )}
    </div>
  );
}
