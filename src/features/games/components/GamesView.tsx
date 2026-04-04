/**
 * Games View Component
 * Main view for games state - routes between hub and active game
 */

import React, { useState } from "react";
import { GamesHub } from "./GamesHub";
import { GAMES_REGISTRY } from "../config/gamesConfig";

export const GamesView: React.FC = () => {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const handleSelectGame = (gameId: string) => {
    setActiveGameId(gameId);
  };

  const handleExitGame = () => {
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
