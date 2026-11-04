/**
 * Slice Countdown
 * 3-2-1-GO over the live canvas, with the win rule. The player's own trail is already live
 * underneath, so they can practise.
 */

import React, { useEffect, useState } from "react";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import { WIN_RULE_TEXT } from "./winRuleText";

interface Props {
  onDone: () => void;
}

export const SliceCountdown: React.FC<Props> = ({ onDone }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= C.COUNTDOWN_STEPS.length) {
      onDone();
      return;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), C.COUNTDOWN_STEP_MS);
    return () => clearTimeout(t);
  }, [idx, onDone]);

  if (idx >= C.COUNTDOWN_STEPS.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-6">
      <div key={idx} className="animate-pop font-jersey text-[clamp(160px,38vh,320px)] leading-none tracking-[8px] text-[#ffd700] [text-shadow:6px_6px_0_rgba(0,0,0,0.5)]">
        {C.COUNTDOWN_STEPS[idx]}
      </div>
      <p className="m-0 font-jersey text-[clamp(32px,5.5vh,56px)] tracking-[4px] text-white [text-shadow:3px_3px_0_rgba(0,0,0,0.45)]">{WIN_RULE_TEXT} to win!</p>
    </div>
  );
};
