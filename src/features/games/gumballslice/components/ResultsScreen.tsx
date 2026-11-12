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
import { STRIKE_RULE_TEXT, WIN_RULE_TEXT, tooMuchBroccoli } from "./winRuleText";

// The wood-seam colour from the game's table, nearly opaque.
const OVERLAY =
  "animate-gs-results-in absolute inset-0 z-20 flex flex-col items-center justify-center gap-[clamp(12px,2.8vh,28px)] bg-[#2e1909]/88 p-6 font-jersey text-white backdrop-blur-[6px]";
const TITLE =
  "m-0 text-[clamp(64px,13vh,140px)] leading-none tracking-[8px] [text-shadow:4px_4px_0_rgba(0,0,0,0.4),0_6px_0_var(--color-magenta)]";
// Same as the DrawIt / FlapFlap menu buttons.
const BUTTON =
  "cursor-pointer rounded-[14px] border-4 border-solid border-white px-[clamp(36px,5vw,60px)] py-[clamp(10px,2vh,20px)] font-jersey text-[clamp(28px,4.5vh,42px)] tracking-[4px] transition-transform duration-[120ms] ease-[ease] hover:[transform:scale(1.05)]";

interface ActionsProps {
  onPlayAgain: () => void;
  onMenu: () => void;
}

const Actions: React.FC<ActionsProps> = ({ onPlayAgain, onMenu }) => (
  <div className="flex gap-6">
    <button className={`${BUTTON} bg-white text-[#4e2c14]`} onClick={onPlayAgain}>
      play again
    </button>
    <button className={`${BUTTON} bg-transparent text-white`} onClick={onMenu}>
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
  <div
    className={`flex items-baseline gap-[10px] tracking-[3px] ${
      highlight ? "text-[clamp(32px,5.5vh,56px)] text-[#ffd700]" : "text-[clamp(24px,4vh,40px)]"
    }`}
  >
    <dt>{label}</dt>
    <span className="flex-1 -translate-y-[6px] border-b-[3px] border-dotted border-white/40" aria-hidden="true" />
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
  <div className={OVERLAY}>
    <h1 className={TITLE}>{result.fullRound ? "time's up!" : "you're out!"}</h1>

    <div className="flex max-w-full items-center justify-center gap-[clamp(32px,6vw,96px)]">
      <dl className="m-0 flex w-[clamp(280px,30vw,440px)] flex-col gap-[clamp(4px,1vh,10px)]">
        <ReceiptLine label="score" value={`${result.score}`} highlight />
        <ReceiptLine label="candy" value={`${result.slicedCount}/${C.MIN_SLICES}`} />
        <ReceiptLine label="broccoli" value={`${result.broccoliHits}`} />
        <ReceiptLine label="accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
        <ReceiptLine label="best combo" value={`×${result.bestCombo}`} />
      </dl>

      <div className="flex max-w-[clamp(320px,38vw,600px)] flex-col items-center gap-[clamp(10px,2vh,20px)] text-center">
        <p
          className={`m-0 text-[clamp(26px,4.5vh,48px)] tracking-[4px] ${
            result.qualifies ? "text-lime/93" : "text-white opacity-80"
          }`}
        >
          {outcomeText(result)}
        </p>
        {claimPayload && <CandyClaim payload={claimPayload} />}
      </div>
    </div>

    <Actions onPlayAgain={onPlayAgain} onMenu={onMenu} />
  </div>
);

export const PlayerLostScreen: React.FC<ActionsProps> = ({ onPlayAgain, onMenu }) => (
  <div className={OVERLAY}>
    <h1 className={TITLE}>we lost you!</h1>
    <p className="m-0 max-w-[1100px] text-center text-[clamp(30px,5vh,52px)] tracking-[3px]">no hand was seen for a few seconds, so this round doesn't count.</p>
    <Actions onPlayAgain={onPlayAgain} onMenu={onMenu} />
  </div>
);

export const LoadErrorScreen: React.FC<{ onMenu: () => void }> = ({ onMenu }) => (
  <div className={OVERLAY}>
    <h1 className={TITLE}>oh no!</h1>
    <p className="m-0 max-w-[1100px] text-center text-[clamp(30px,5vh,52px)] tracking-[3px]">we couldn't load the game. please head back and try again.</p>
    <button className={`${BUTTON} bg-white text-[#4e2c14]`} onClick={onMenu}>
      menu
    </button>
  </div>
);
