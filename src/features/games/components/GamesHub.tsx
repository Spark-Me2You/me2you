/**
 * Games Hub Component
 * Game selection menu showing available games
 */

import React from "react";
import { useAppState } from "@/core/state-machine";
import { AppState } from "@/core/state-machine/appStateMachine";
import { GAMES_REGISTRY } from "../config/gamesConfig";
import styles from "./GamesHub.module.css";

interface GamesHubProps {
  onSelectGame: (gameId: string) => void;
}

export const GamesHub: React.FC<GamesHubProps> = ({ onSelectGame }) => {
  const { transitionTo } = useAppState();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Games</h1>

      <div className={styles.gameGrid}>
        {GAMES_REGISTRY.map((game) => (
          <button
            key={game.id}
            className={styles.gameCard}
            onClick={() => onSelectGame(game.id)}
          >
            <div className={styles.gameThumbnail}>
              <span className={styles.gameEmoji}>🐦</span>
            </div>
            <h2 className={styles.gameName}>{game.name}</h2>
            <p className={styles.gameDescription}>{game.description}</p>
          </button>
        ))}
      </div>

      <button
        className={styles.exitButton}
        onClick={() => transitionTo(AppState.IDLE)}
      >
        exit
      </button>
    </div>
  );
};
