import React, { useEffect, useState } from "react";
import { COUNTDOWN_STEPS, COUNTDOWN_STEP_MS } from "../config/drawitConfig";

interface Props {
  onDone: () => void;
}

export const Countdown: React.FC<Props> = ({ onDone }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= COUNTDOWN_STEPS.length) {
      onDone();
      return;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), COUNTDOWN_STEP_MS);
    return () => clearTimeout(t);
  }, [idx, onDone]);

  if (idx >= COUNTDOWN_STEPS.length) return null;

  return (
    <div className="flex items-center justify-center">
      <div key={idx} className="animate-pop font-jersey text-[320px] tracking-[8px] text-[#ff0] [text-shadow:6px_6px_0_rgba(0,0,0,0.5)]">
        {COUNTDOWN_STEPS[idx]}
      </div>
    </div>
  );
};
