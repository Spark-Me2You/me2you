/**
 * Game Types
 * Shared type definitions for all games
 */

import type { ComponentType } from "react";

export type GameState = "MENU" | "READY" | "PLAYING" | "PAUSED" | "GAME_OVER";

export interface GameScore {
  current: number;
  high: number; // Session high only
}

export interface GameProps {
  onExit: () => void;
  onScoreChange?: (score: number) => void;
}

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  component: ComponentType<GameProps>;
}
