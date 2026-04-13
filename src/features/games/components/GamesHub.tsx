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

      {/* Decorative green bars - scattered positions */}
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

      {/* Decorative circular images - scattered positions */}
      <img
        src="/animations/default.png"
        className={styles.decorativeImage1}
        alt=""
        aria-hidden="true"
      />
      <img
        src="/animations/default2.png"
        className={styles.decorativeImage2}
        alt=""
        aria-hidden="true"
      />
      <img
        src="/animations/default3.png"
        className={styles.decorativeImage3}
        alt=""
        aria-hidden="true"
      />
      <img
        src="/animations/default.png"
        className={styles.decorativeImage4}
        alt=""
        aria-hidden="true"
      />
      <img
        src="/animations/default2.png"
        className={styles.decorativeImage5}
        alt=""
        aria-hidden="true"
      />
      <img
        src="/animations/default3.png"
        className={styles.decorativeImage6}
        alt=""
        aria-hidden="true"
      />
      <img
        src="/animations/default.png"
        className={styles.decorativeImage7}
        alt=""
        aria-hidden="true"
      />
      <img
        src="/animations/default2.png"
        className={styles.decorativeImage8}
        alt=""
        aria-hidden="true"
      />

      {/* Games container - vertical stack */}
      <div className={styles.gamesContainer}>
        {GAMES_REGISTRY.map((game) => (
          <button
            key={game.id}
            className={styles.gameButton}
            onClick={() => onSelectGame(game.id)}
          >
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
