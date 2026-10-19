import React, { useEffect, useState } from "react";
import {
  DRAW_DURATION_SEC,
  TIMER_FLASH_THRESHOLD_SEC,
  TIMER_PULSE_THRESHOLD_SEC,
} from "../config/drawitConfig";

interface Props {
  onExpire: () => void;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export const Timer: React.FC<Props> = ({ onExpire }) => {
  const [sec, setSec] = useState(DRAW_DURATION_SEC);

  useEffect(() => {
    if (sec <= 0) {
      onExpire();
      return;
    }
    const t = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sec, onExpire]);

  const cls =
    sec <= TIMER_FLASH_THRESHOLD_SEC
      ? "animate-timer-flash text-[#f00]"
      : sec <= TIMER_PULSE_THRESHOLD_SEC
        ? "animate-timer-pulse text-[#f44]"
        : "bg-[rgba(0,0,0,0.6)] text-white";

  return <div className={`fixed top-5 right-5 z-[9999] rounded-[12px] border-[3px] border-solid border-[rgba(255,255,255,0.4)] px-6 py-[10px] font-jersey text-[52px] tracking-[4px] ${cls}`}>{fmt(Math.max(0, sec))}</div>;
};
