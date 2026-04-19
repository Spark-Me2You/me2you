import React, { useEffect, useState } from "react";
import {
  DRAW_DURATION_SEC,
  TIMER_FLASH_THRESHOLD_SEC,
  TIMER_PULSE_THRESHOLD_SEC,
} from "../config/drawitConfig";
import styles from "./Timer.module.css";

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
      ? styles.flash
      : sec <= TIMER_PULSE_THRESHOLD_SEC
        ? styles.pulse
        : styles.normal;

  return <div className={`${styles.timer} ${cls}`}>{fmt(Math.max(0, sec))}</div>;
};
