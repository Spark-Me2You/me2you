/**
 * FlapFlap Launcher
 * Mode-select screen (1 player / 2 player) shown before either FlapFlap game
 */

import React, { useState } from "react";
import type { GameProps } from "../types/game";
import { FlapFlapGame } from "../flapflap/components/FlapFlapGame";
import { FlapFlap2PGame } from "../flapflap2p/components/FlapFlap2PGame";

const BTN =
  "cursor-pointer rounded-[14px] border-4 border-solid px-[60px] py-5 font-jersey text-[42px] leading-[normal] tracking-[4px] [transition:transform_120ms_ease] hover:[transform:scale(1.05)]";
const PRIMARY = `${BTN} border-white bg-white text-[#008080]`;
const SECONDARY = `${BTN} border-white bg-transparent text-white`;

type Mode = "SELECT" | "ONE_PLAYER" | "TWO_PLAYER";

export const FlapFlapLauncher: React.FC<GameProps> = (props) => {
  const [mode, setMode] = useState<Mode>("SELECT");

  if (mode === "ONE_PLAYER") return <FlapFlapGame {...props} />;
  if (mode === "TWO_PLAYER") return <FlapFlap2PGame {...props} />;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-[60px] bg-[#008080]">
      <h1 className="m-0 font-jersey text-[160px] tracking-[8px] text-white [text-shadow:4px_4px_0_rgba(0,0,0,0.4)]">FlapFlap</h1>
      <div className="flex flex-col items-center gap-6">
        <button className={PRIMARY} onClick={() => setMode("ONE_PLAYER")}>
          1 Player
        </button>
        <button className={PRIMARY} onClick={() => setMode("TWO_PLAYER")}>
          2 Player
        </button>
        <button className={SECONDARY} onClick={props.onExit}>
          Back
        </button>
      </div>
    </div>
  );
};
