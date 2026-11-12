/**
 * Inactivity hint — a faded otter hand that swipes diagonally up and to the right
 * through the screen center three times, nudging an idle visitor to raise their hand and use the CV cursor.
 * Overlays its positioned parent and never takes pointer events.
 */

import { useEffect } from "react";
import otterHandImage from "@/assets/hand.png";

/** Must match `--animate-inactivity-swipe` in theme.css (1600ms × 3). */
export const INACTIVITY_HINT_DURATION_MS = 4_800;

interface InactivityHintProps {
  /** Called once all three swipes have finished. */
  onDone: () => void;
}

// hand.png's visible paw sits in the lower-left of its 360×191px box (center ≈ 126px, 108px
// once the arm is faded out). The offsets start that paw 75% down the screen and 149px left of
// center; the keyframe moves it 298px right and 540px up, ending 25% down and 149px right of center.
// The bottom mask fades the arm's cut-off edge so it floats rather than rising from below.
export function InactivityHint({ onDone }: InactivityHintProps) {
  // animationend ends the hint on time; this backstop covers a missed event.
  useEffect(() => {
    const id = setTimeout(onDone, INACTIVITY_HINT_DURATION_MS + 500);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[40] overflow-hidden"
      data-testid="inactivity-hint"
      aria-hidden="true"
    >
      <img
        src={otterHandImage}
        alt=""
        onAnimationEnd={onDone}
        className="absolute top-[calc(75%-108px)] left-[calc(50%-275px)] w-[360px] animate-inactivity-swipe mask-b-from-55% select-none"
      />
    </div>
  );
}
