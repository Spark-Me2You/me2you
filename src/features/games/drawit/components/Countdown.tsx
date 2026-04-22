import React, { useEffect, useState } from "react";
import { COUNTDOWN_STEPS, COUNTDOWN_STEP_MS } from "../config/drawitConfig";
import styles from "./Countdown.module.css";

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
    <div className={styles.container}>
      <div key={idx} className={styles.number}>
        {COUNTDOWN_STEPS[idx]}
      </div>
    </div>
  );
};
