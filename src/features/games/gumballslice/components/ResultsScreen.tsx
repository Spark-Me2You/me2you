/**
 * Results Screen
 * End-of-round receipt (score, accuracy, best combo, goal, broccoli) beside
 * the outcome and, for winning rounds, the candy claim QR. PlayerLostScreen is shown instead when
 * the round was abandoned and its score discarded.
 */

import React from "react";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import type { RoundOutcome, RoundResult } from "../types/gumballSlice";
import { CandyClaim } from "./CandyClaim";
import styles from "./ResultsScreen.module.css";
import { STRIKE_RULE_TEXT, WIN_RULE_TEXT, tooMuchBroccoli } from "./winRuleText";

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

/** One receipt line: label ....... value */
const ReceiptLine: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight = false,
}) => (
  <div className={`${styles.line} ${highlight ? styles.lineHighlight : ""}`}>
    <dt>{label}</dt>
    <span className={styles.leader} aria-hidden="true" />
    <dd>{value}</dd>
  </div>
);

interface ResultsProps extends ActionsProps {
  outcome: RoundOutcome;
}

function outcomeText(result: RoundResult): string {
  if (result.qualifies) return "claim your candy at the gumball machine!";
  if (!result.fullRound) return `${STRIKE_RULE_TEXT} no candy this time`;
  if (tooMuchBroccoli(result.broccoliHits)) return "you sliced broccoli, so no candy this time";
  return `${WIN_RULE_TEXT} to win candy`;
}

export const ResultsScreen: React.FC<ResultsProps> = ({
  outcome: { result, claimPayload },
  onPlayAgain,
  onMenu,
}) => (
  <div className={styles.overlay}>
    <h1 className={styles.title}>{result.fullRound ? "time's up!" : "you're out!"}</h1>

    <div className={styles.body}>
      <dl className={styles.receipt}>
        <ReceiptLine label="score" value={`${result.score}`} highlight />
        <ReceiptLine label="candy" value={`${result.slicedCount}/${C.MIN_SLICES}`} />
        <ReceiptLine label="broccoli" value={`${result.broccoliHits}`} />
        <ReceiptLine label="accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
        <ReceiptLine label="best combo" value={`×${result.bestCombo}`} />
      </dl>

      <div className={styles.reward}>
        <p className={result.qualifies ? styles.qualified : styles.notQualified}>
          {outcomeText(result)}
        </p>
        {claimPayload && <CandyClaim payload={claimPayload} />}
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
