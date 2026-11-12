/**
 * Game Types
 * Shared type definitions for all games
 */

import type { ComponentType } from "react";

export interface GameProps {
  onExit: () => void;
}

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  component: ComponentType<GameProps>;
}
