/**
 * Results Screen
 * End-of-round summary (score, accuracy, best combo, goal) plus the reserved
 * spot for the reward claim QR. PlayerLostScreen is shown instead when the
 * round was abandoned and its score discarded.
 */

import React from "react";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import type { RoundResult } from "../types/gumballSlice";
import styles from "./ResultsScreen.module.css";

interface ActionsProps {
  onPlayAgain: () => void;
  onMenu: () => void;
}

const Actions: React.FC<ActionsProps> = ({ onPlayAgain, onMenu }) => (
  <div className={styles.buttons}>
    <button className={styles.primary} onClick={onPlayAgain}>
      play again
    </button>
    <button className={styles.secondary} onClick={onMenu}>
      menu
    </button>
  </div>
);

interface ResultsProps extends ActionsProps {
  result: RoundResult;
}

export const ResultsScreen: React.FC<ResultsProps> = ({ result, onPlayAgain, onMenu }) => (
  <div className={styles.overlay}>
    <h1 className={styles.title}>time's up!</h1>
    <p className={styles.score}>{result.score} points</p>

    <div className={styles.stats}>
      <div className={styles.stat}>
        <span className={styles.statValue}>{Math.round(result.accuracy * 100)}%</span>
        <span className={styles.statLabel}>accuracy</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statValue}>×{result.bestCombo}</span>
        <span className={styles.statLabel}>best combo</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statValue}>
          {result.slicedCount}/{C.MIN_SLICES}
        </span>
        <span className={styles.statLabel}>candy goal</span>
      </div>
    </div>

    <div className={styles.rewardRow}>
      <p className={result.qualifies ? styles.qualified : styles.notQualified}>
        {result.qualifies
          ? "goal reached, this run qualifies!"
          : `slice ${C.MIN_SLICES} candies to qualify`}
      </p>
      <div className={styles.qrPlaceholder} aria-label="reward claim QR placeholder">
        claim QR
      </div>
    </div>

    <Actions onPlayAgain={onPlayAgain} onMenu={onMenu} />
  </div>
);

export const PlayerLostScreen: React.FC<ActionsProps> = ({ onPlayAgain, onMenu }) => (
  <div className={styles.overlay}>
    <h1 className={styles.title}>we lost you!</h1>
    <p className={styles.message}>no hand was seen for a few seconds, so this round doesn't count.</p>
    <Actions onPlayAgain={onPlayAgain} onMenu={onMenu} />
  </div>
);
