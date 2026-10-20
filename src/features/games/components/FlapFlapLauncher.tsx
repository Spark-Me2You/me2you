/**
 * FlapFlap Launcher
 * Mode-select screen (1 player / 2 player) shown before either FlapFlap game
 */

import React, { useState } from "react";
import type { GameProps } from "../types/game";
import { FlapFlapGame } from "../flapflap/components/FlapFlapGame";
import { FlapFlap2PGame } from "../flapflap2p/components/FlapFlap2PGame";
import { BTN_LG, BTN_PRIMARY, BTN_SECONDARY, GAME_TITLE } from "./gameUi";

const PRIMARY = `${BTN_LG} ${BTN_PRIMARY}`;
const SECONDARY = `${BTN_LG} ${BTN_SECONDARY}`;

type Mode = "SELECT" | "ONE_PLAYER" | "TWO_PLAYER";

export const FlapFlapLauncher: React.FC<GameProps> = (props) => {
  const [mode, setMode] = useState<Mode>("SELECT");

  if (mode === "ONE_PLAYER") return <FlapFlapGame {...props} />;
  if (mode === "TWO_PLAYER") return <FlapFlap2PGame {...props} />;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-[60px] bg-games-gradient">
      <h1 className={GAME_TITLE}>flapflap</h1>
      <div className="flex flex-col items-center gap-6">
        <button className={PRIMARY} onClick={() => setMode("ONE_PLAYER")}>
          1 player
        </button>
        <button className={PRIMARY} onClick={() => setMode("TWO_PLAYER")}>
          2 players
        </button>
        <button className={SECONDARY} onClick={props.onExit}>
          back
        </button>
      </div>
    </div>
  );
};
