/**
 * Games View Component
 * Main view for games state - routes between hub and active game
 */

import React, { useEffect, useState } from "react";
import { GamesHub } from "./GamesHub";
import { GAMES_REGISTRY } from "../config/gamesConfig";
import { useCvCursorEnabled } from "@/core/cv/cursor";

export const GamesView: React.FC = () => {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const { setEnabled: setCvCursorEnabled } = useCvCursorEnabled();

  // A game disables the cursor while playing; if the whole view unmounts mid-game
  // (e.g. inactivity sends the kiosk to IDLE) handleExitGame never runs, so
  // restore it here.
  useEffect(() => () => setCvCursorEnabled(true), [setCvCursorEnabled]);

  const handleSelectGame = (gameId: string) => {
    setActiveGameId(gameId);
  };

  const handleExitGame = () => {
    // Re-enable cursor here (click-event context) rather than inside a
    // component cleanup effect, which can corrupt React's fiber list.
    setCvCursorEnabled(true);
    setActiveGameId(null);
  };

  // If a game is active, render it
  if (activeGameId) {
    const game = GAMES_REGISTRY.find((g) => g.id === activeGameId);
    if (game) {
      const GameComponent = game.component;
      return <GameComponent onExit={handleExitGame} />;
    }
  }

  // Otherwise show the games hub
  return <GamesHub onSelectGame={handleSelectGame} />;
};
