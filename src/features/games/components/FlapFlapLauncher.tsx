/**
 * FlapFlap Launcher
 * Mode-select screen (1 player / 2 player) shown before either FlapFlap game
 */

import React, { useState } from "react";
import type { GameProps } from "../types/game";
import { FlapFlapGame } from "../flapflap/components/FlapFlapGame";
import { FlapFlap2PGame } from "../flapflap2p/components/FlapFlap2PGame";
import styles from "./FlapFlapLauncher.module.css";

type Mode = "SELECT" | "ONE_PLAYER" | "TWO_PLAYER";

export const FlapFlapLauncher: React.FC<GameProps> = (props) => {
  const [mode, setMode] = useState<Mode>("SELECT");

  if (mode === "ONE_PLAYER") return <FlapFlapGame {...props} />;
  if (mode === "TWO_PLAYER") return <FlapFlap2PGame {...props} />;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>FlapFlap</h1>
      <div className={styles.buttons}>
        <button className={styles.primary} onClick={() => setMode("ONE_PLAYER")}>
          1 Player
        </button>
        <button className={styles.primary} onClick={() => setMode("TWO_PLAYER")}>
          2 Player
        </button>
        <button className={styles.secondary} onClick={props.onExit}>
          Back
        </button>
      </div>
    </div>
  );
};
