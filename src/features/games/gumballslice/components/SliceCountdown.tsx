/**
 * Slice Countdown
 * 3-2-1-GO over the live canvas. The player's own trail is already live
 * underneath, so they can practise.
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
    <div className={styles.container}>
      <div key={idx} className={styles.number}>
        {C.COUNTDOWN_STEPS[idx]}
      </div>
      <p className={styles.caption}>swipe fast through the candy!</p>
    </div>
  );
};
