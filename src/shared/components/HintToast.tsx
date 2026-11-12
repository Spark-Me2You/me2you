import React from "react";
import type { ActiveHint } from "@/shared/hooks/useHints";

// Outer layer owns position, tilt and the fade-out (duration-700 matches
// HINT_FADE_OUT_MS); the inner note owns the entrance animation, so no element animates a property a utility also sets.
const WRAPPER =
  "pointer-events-none fixed bottom-[8%] left-1/2 z-[150] -translate-x-1/2 -rotate-2 transition-opacity duration-700 ease-in-out";
const NOTE =
  "relative max-w-[min(640px,60vw)] animate-hint-in rounded-[6px] bg-note px-8 pt-7 pb-5 shadow-note";
const TAPE =
  "absolute top-[-12px] left-1/2 h-5 w-[90px] -translate-x-1/2 rotate-[4deg] bg-tape shadow-tape";
const TEXT =
  "m-0 text-center font-averia text-body-lg leading-[1.25] tracking-brand text-ink lowercase";

interface HintToastProps {
  hint: ActiveHint | null;
}

/** Sticky-note hint that eases in, then fades out. Driven by `useHints`. */
export const HintToast: React.FC<HintToastProps> = ({ hint }) => {
  if (!hint) return null;

  return (
    <div
      className={`${WRAPPER} ${hint.leaving ? "opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
    >
      <div key={hint.id} className={NOTE}>
        <div className={TAPE} aria-hidden="true" />
        <p className={TEXT}>{hint.text}</p>
      </div>
    </div>
  );
};
