/**
 * Slice HUD
 * Score, timer, candy-goal bar, broccoli strikes (X X X), live combo counter
 * and the "come back" warning.
 */

import React from "react";
import { GUMBALL_SLICE_CONFIG as C } from "../config/gumballSliceConfig";
import type { HudSnapshot } from "../types/gumballSlice";

const TIMER_PULSE_SEC = 10;

const PANEL = "rounded-[12px] border-[3px] border-solid border-white/40 bg-ink/60";

interface Props {
  hud: HudSnapshot;
}

export const SliceHud: React.FC<Props> = ({ hud }) => {
  const goalProgress = Math.min(1, hud.slicedCount / C.MIN_SLICES);
  const goalMet = hud.slicedCount >= C.MIN_SLICES;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-jersey text-white">
      <div className={`${PANEL} absolute top-5 left-5 flex flex-col items-start px-7 pt-2 pb-3`}>
        <span className="text-[clamp(20px,3vh,32px)] tracking-[4px] opacity-80">score</span>
        <span className="text-[clamp(52px,9vh,96px)] leading-[0.9] tracking-[4px] text-[#ffd700]">{hud.score}</span>
      </div>

      <div className={`${PANEL} absolute top-5 left-1/2 box-content flex w-[min(560px,40vw)] -translate-x-1/2 flex-col gap-2 px-6 pt-3 pb-[18px]`}>
        <span className={`text-center text-[clamp(28px,4.5vh,48px)] tracking-[4px] ${goalMet ? "text-lime/93" : ""}`}>
          Candy goal: {hud.slicedCount}/{C.MIN_SLICES}
        </span>
        <div className="h-[22px] overflow-hidden rounded-[11px] bg-white/15">
          <div
            className={`h-full rounded-[11px] transition-[width] duration-200 ease-out ${goalMet ? "bg-lime/93" : "bg-magenta"}`}
            style={{ width: `${goalProgress * 100}%` }} />
        </div>
        <div className="flex items-center justify-center gap-[clamp(6px,1vh,12px)]">
          <span className="mr-[6px] text-[clamp(20px,3vh,32px)] tracking-[3px]">broccoli</span>
          {Array.from({ length: C.BROCCOLI_STRIKES }, (_, i) => (
            <span
              key={i}
              className={`box-border flex size-[clamp(32px,5vh,52px)] items-center justify-center rounded-[8px] border-[3px] border-solid text-[clamp(26px,4vh,44px)] leading-none ${
                i < hud.broccoliHits
                  ? "animate-gs-strike-pop border-white bg-red text-white"
                  : "border-white/40 text-white/35"
              }`}
            >
              X
            </span>
          ))}
        </div>
      </div>

      <div
        className={`${PANEL} absolute top-5 right-5 box-content min-w-[120px] px-7 py-3 text-center text-[clamp(52px,9vh,96px)] leading-none tracking-[4px] ${
          hud.secondsLeft <= TIMER_PULSE_SEC ? "animate-gs-pulse text-orange/93" : ""
        }`}
      >
        {hud.secondsLeft}
      </div>

      {hud.comboCount >= 2 && (
        <div key={hud.comboCount} className="animate-gs-combo-pop absolute top-[clamp(120px,19vh,190px)] left-1/2 -translate-x-1/2 text-[clamp(40px,7vh,72px)] tracking-[6px] text-lime/93 [text-shadow:4px_4px_0_rgba(0,0,0,0.5)]">
          combo ×{hud.comboCount}
        </div>
      )}

      {hud.playerMissing && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-glass border-[3px] border-solid border-orange/93 bg-ink/70 px-14 py-8 text-center">
          <p className="m-0 text-[clamp(64px,12vh,120px)] leading-none tracking-[6px] text-orange/93">come back!</p>
          <p className="mt-2 mb-0 text-[clamp(28px,4.5vh,48px)] tracking-[4px]">show your hand to keep playing</p>
        </div>
      )}
    </div>
  );
};
