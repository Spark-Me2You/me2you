/**
 * Slice Countdown
 * 3-2-1-GO over the live canvas, with a short demo of a slash cutting a
 * gumball on every beat. The player's own trail is already live underneath,
 * so they can practise.
 */

import React, { useEffect, useState } from "react";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import styles from "./SliceCountdown.module.css";

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
    <div
      className={styles.container}
      style={{ ["--step-ms" as string]: `${C.COUNTDOWN_STEP_MS}ms` }}
    >
      <div key={idx} className={styles.number}>
        {C.COUNTDOWN_STEPS[idx]}
      </div>
      <div key={`demo-${idx}`} className={styles.demo} aria-hidden="true">
        <div className={`${styles.candy} ${styles.left}`} />
        <div className={`${styles.candy} ${styles.right}`} />
        <div className={styles.slash} />
      </div>
      <p className={styles.caption}>swipe fast through the candy!</p>
    </div>
  );
};
