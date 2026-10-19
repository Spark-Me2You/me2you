/**
 * Slice HUD
 * Score, timer, candy-goal bar, live combo counter and the "come back" warning.
 */

import React from "react";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import type { HudSnapshot } from "../types/gumballSlice";
import styles from "./SliceHud.module.css";

const TIMER_PULSE_SEC = 10;

interface Props {
  hud: HudSnapshot;
}

export const SliceHud: React.FC<Props> = ({ hud }) => {
  const goalProgress = Math.min(1, hud.slicedCount / C.MIN_SLICES);
  const goalMet = hud.slicedCount >= C.MIN_SLICES;

  return (
    <div className={styles.hud}>
      <div className={styles.score}>
        <span className={styles.label}>score</span>
        <span className={styles.value}>{hud.score}</span>
      </div>

      <div className={`${styles.goal} ${goalMet ? styles.goalMet : ""}`}>
        <span className={styles.goalText}>
          Candy goal: {hud.slicedCount}/{C.MIN_SLICES}
        </span>
        <div className={styles.goalTrack}>
          <div className={styles.goalFill} style={{ width: `${goalProgress * 100}%` }} />
        </div>
      </div>

      <div className={`${styles.timer} ${hud.secondsLeft <= TIMER_PULSE_SEC ? styles.pulse : ""}`}>
        {hud.secondsLeft}
      </div>

      {hud.comboCount >= 2 && (
        <div key={hud.comboCount} className={styles.combo}>
          combo ×{hud.comboCount}
        </div>
      )}

      {hud.playerMissing && (
        <div className={styles.missing}>
          <p className={styles.missingTitle}>come back!</p>
          <p className={styles.missingText}>show your hand to keep playing</p>
        </div>
      )}
    </div>
  );
};
