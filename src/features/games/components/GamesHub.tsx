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
      {/* Background overlay for gradient effect */}
      <div className={styles.backgroundOverlay} />

      {/* Title with Pixelify Sans */}
      <h1 className={styles.title}>games</h1>

      {/* Games container - vertical stack */}
      <div className={styles.gamesContainer}>
        {GAMES_REGISTRY.map((game) => (
          <button
            key={game.id}
            className={styles.gameButton}
            onClick={() => onSelectGame(game.id)}
          >
            {/* Decorative green bars - inside button */}
            <div className={styles.decorativeBar1} />
            <div className={styles.decorativeBar2} />
            <div className={styles.decorativeBar3} />
            <div className={styles.decorativeBar4} />
            <div className={styles.decorativeBar5} />
            <div className={styles.decorativeBar6} />
            <div className={styles.decorativeBar7} />
            <div className={styles.decorativeBar8} />
            <div className={styles.decorativeBar9} />
            <div className={styles.decorativeBar10} />

            {/* Decorative circular elements - bird-like circles */}
            <div className={styles.decorativeImage1} aria-hidden="true" />
            <div className={styles.decorativeImage2} aria-hidden="true" />
            <div className={styles.decorativeImage3} aria-hidden="true" />
            <div className={styles.decorativeImage4} aria-hidden="true" />
            <div className={styles.decorativeImage5} aria-hidden="true" />
            <div className={styles.decorativeImage6} aria-hidden="true" />
            <div className={styles.decorativeImage7} aria-hidden="true" />
            <div className={styles.decorativeImage8} aria-hidden="true" />

            {/* Game content */}
            <h2 className={styles.gameName}>{game.name}</h2>
            <p className={styles.gameDescription}>{game.description}</p>
          </button>
        ))}
      </div>

      {/* Exit button */}
      <button
        className={styles.exitButton}
        onClick={() => transitionTo(AppState.IDLE)}
      >
        exit
      </button>
    </div>
  );
};
